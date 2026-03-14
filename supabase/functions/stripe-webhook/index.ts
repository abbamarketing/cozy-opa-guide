import { getCorsHeaders } from "../_shared/cors.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_API = "https://api.stripe.com/v1";

// Minimal HMAC-SHA256 webhook signature verification using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Check timestamp tolerance (5 minutes)
  const ts = parseInt(timestamp);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload),
  );

  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((sig) => sig === expectedSig);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, "stripe-signature");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  // 1. Verify webhook signature
  if (!signature) {
    console.error("Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const isValid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!isValid) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  console.log(`Processing Stripe event: ${event.type} (${event.id})`);

  // 2. Production livemode check (log warning, don't block)
  if (Deno.env.get("ENVIRONMENT") === "production" && !event.livemode) {
    console.warn(`Received test event ${event.id} in production — skipping`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      // ─── checkout.session.completed ───
      case "checkout.session.completed": {
        const session = event.data.object;
        const userProjectId = session.metadata?.user_project_id;
        const userId = session.metadata?.user_id;

        if (!userProjectId) {
          console.error("checkout.session.completed: missing user_project_id in metadata");
          break;
        }

        if (session.payment_status !== "paid") {
          console.warn(`Session ${session.id} payment_status is ${session.payment_status}, skipping`);
          break;
        }

        const now = new Date().toISOString();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: upError } = await supabase
          .from("user_projects")
          .update({
            status: "active",
            payment_confirmed_at: now,
            stripe_subscription_id: session.subscription,
            current_period_start: now,
            current_period_end: periodEnd,
          })
          .eq("id", userProjectId);

        if (upError) {
          console.error(`Failed to update user_project ${userProjectId}:`, upError);
        } else {
          console.log(`user_project ${userProjectId} activated successfully`);
        }

        // Log to system_logs
        await supabase.from("system_logs").insert({
          level: "info",
          message: `Payment confirmed for project ${userProjectId}`,
          source: "stripe-webhook",
          user_id: userId || null,
          context: { event_id: event.id, session_id: session.id },
        });

        break;
      }

      // ─── customer.subscription.updated ───
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const updateData: Record<string, unknown> = {
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        // Map Stripe status to our status
        if (subscription.status === "active") {
          updateData.status = "active";
        } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
          updateData.status = "suspended";
        } else if (subscription.status === "canceled") {
          updateData.status = "cancelled";
        }

        // Check if new period started (reset quotas)
        const { data: existingProject } = await supabase
          .from("user_projects")
          .select("current_period_start")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        const newPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        const isNewPeriod = existingProject && existingProject.current_period_start !== newPeriodStart;

        if (isNewPeriod) {
          updateData.youtube_reserved = 0;
          updateData.instagram_reserved = 0;
          updateData.thumbnails_reserved = 0;
          updateData.covers_reserved = 0;
          updateData.youtube_approved = 0;
          updateData.instagram_approved = 0;
          updateData.thumbnails_approved = 0;
          updateData.covers_approved = 0;
          console.log(`New billing period detected for subscription ${subscriptionId} — quotas reset`);
        }

        const { error } = await supabase
          .from("user_projects")
          .update(updateData)
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error(`Failed to update subscription ${subscriptionId}:`, error);
        } else {
          console.log(`Subscription ${subscriptionId} updated`);
        }

        await supabase.from("system_logs").insert({
          level: "info",
          message: `Subscription ${subscriptionId} updated: ${subscription.status}`,
          source: "stripe-webhook",
          context: { event_id: event.id, subscription_status: subscription.status, new_period: isNewPeriod },
        });

        break;
      }

      // ─── customer.subscription.deleted ───
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const { error } = await supabase
          .from("user_projects")
          .update({
            status: "cancelled",
            // Keep current_period_end so user retains access until end of paid period
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error(`Failed to cancel subscription ${subscriptionId}:`, error);
        } else {
          console.log(`Subscription ${subscriptionId} cancelled — access until period end`);
        }

        await supabase.from("system_logs").insert({
          level: "warn",
          message: `Subscription ${subscriptionId} deleted/cancelled`,
          source: "stripe-webhook",
          context: { event_id: event.id, period_end: subscription.current_period_end },
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing event ${event.type}:`, err);
    // Return 200 to prevent Stripe retries
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(path: string, method: string, body?: Record<string, string>) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(`${STRIPE_API}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe API error");
  return data;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Get user's active project with stripe subscription
    const { data: userProject, error: upError } = await supabase
      .from("user_projects")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (upError || !userProject?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Retrieve subscription to get customer ID
    const subscription = await stripeRequest(
      `/subscriptions/${userProject.stripe_subscription_id}`,
      "GET",
    );

    const customerId = subscription.customer;
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "Customer not found for subscription" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create billing portal session
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:5173";
    const session = await stripeRequest("/billing_portal/sessions", "POST", {
      customer: customerId,
      return_url: `${siteUrl}/dashboard`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("Portal session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

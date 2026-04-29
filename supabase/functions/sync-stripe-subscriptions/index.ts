// Cron job: reconciles user_projects with Stripe subscriptions in case webhooks fail.
// Runs hourly. Looks for active projects whose current_period_end has passed,
// fetches the truth from Stripe and updates accordingly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API = "https://api.stripe.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  // Find active projects with expired period and a stripe subscription id
  const { data: stale, error: queryErr } = await supabase
    .from("user_projects")
    .select("id, user_id, stripe_subscription_id, current_period_end, status")
    .lt("current_period_end", nowIso)
    .not("stripe_subscription_id", "is", null)
    .in("status", ["active", "trialing", "suspended"]);

  if (queryErr) {
    console.error("Query error:", queryErr);
    return new Response(JSON.stringify({ error: queryErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const project of stale ?? []) {
    try {
      const subRes = await fetch(`${STRIPE_API}/subscriptions/${project.stripe_subscription_id}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });

      if (!subRes.ok) {
        const text = await subRes.text();
        console.error(`Stripe fetch failed for ${project.stripe_subscription_id}: ${text}`);
        results.push({ id: project.id, ok: false, error: text });
        continue;
      }

      const sub = await subRes.json();

      const update: Record<string, unknown> = {
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      };

      // Map status
      if (sub.status === "active" || sub.status === "trialing") update.status = "active";
      else if (sub.status === "past_due" || sub.status === "unpaid") update.status = "suspended";
      else if (sub.status === "canceled") update.status = "cancelled";

      // Detect new period -> reset quotas
      const newStart = update.current_period_start as string;
      if (newStart !== project.current_period_end) {
        Object.assign(update, {
          youtube_reserved: 0, instagram_reserved: 0, thumbnails_reserved: 0, covers_reserved: 0,
          youtube_approved: 0, instagram_approved: 0, thumbnails_approved: 0, covers_approved: 0,
        });
      }

      const { error: updErr } = await supabase
        .from("user_projects").update(update).eq("id", project.id);

      if (updErr) throw updErr;

      await supabase.from("system_logs").insert({
        level: "info",
        source: "sync-stripe-subscriptions",
        user_id: project.user_id,
        message: `Reconciled subscription ${project.stripe_subscription_id} (status=${sub.status})`,
        context: { project_id: project.id, stripe_status: sub.status, new_period_end: update.current_period_end },
      });

      results.push({ id: project.id, ok: true, status: sub.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Reconcile failed for ${project.id}:`, msg);
      results.push({ id: project.id, ok: false, error: msg });
    }
  }

  return new Response(
    JSON.stringify({ checked: stale?.length ?? 0, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

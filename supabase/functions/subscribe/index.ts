import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const STRIPE_API = "https://api.stripe.com/v1";

const TIER_CONFIG: Record<string, { sla_hours: number; monthly_quota: number; slug: string }> = {
  standard: { sla_hours: 72, monthly_quota: 7, slug: "abbavideo_standard" },
  pro:      { sla_hours: 48, monthly_quota: 11, slug: "abbavideo_pro" },
  business: { sla_hours: 24, monthly_quota: 22, slug: "abbavideo_business" },
  premium:  { sla_hours: 8,  monthly_quota: 66, slug: "abbavideo_premium" },
  agency:   { sla_hours: 4,  monthly_quota: 132, slug: "abbavideo_agency" },
};

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
  if (body) options.body = new URLSearchParams(body).toString();
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
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // 2. Parse tier
    const { tier } = await req.json();
    const tierConfig = TIER_CONFIG[tier];
    if (!tierConfig) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 3. Check if user already has a user_project
    const { data: existingUp } = await adminClient
      .from("user_projects")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["pending_payment", "active", "trialing"])
      .maybeSingle();

    if (existingUp?.status === "active" || existingUp?.status === "trialing") {
      return new Response(JSON.stringify({ error: "Você já possui uma assinatura ativa" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get custom_project template
    const { data: template, error: tplErr } = await adminClient
      .from("custom_projects")
      .select("*")
      .eq("custom_slug", tierConfig.slug)
      .eq("active", true)
      .single();

    if (tplErr || !template) {
      return new Response(JSON.stringify({ error: "Plan template not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Create or reuse user_project
    let userProjectId: string;
    if (existingUp?.status === "pending_payment") {
      // Update existing pending_payment to this tier
      await adminClient
        .from("user_projects")
        .update({
          custom_project_id: template.id,
          client_type: "subscription",
          subscription_tier: tier,
          subscription_slug: tierConfig.slug,
          sla_hours: tierConfig.sla_hours,
          monthly_quota: tierConfig.monthly_quota,
        })
        .eq("id", existingUp.id);
      userProjectId = existingUp.id;
    } else {
      const { data: newUp, error: upErr } = await adminClient
        .from("user_projects")
        .insert({
          user_id: userId,
          custom_project_id: template.id,
          status: "pending_payment",
          client_type: "subscription",
          subscription_tier: tier,
          subscription_slug: tierConfig.slug,
          sla_hours: tierConfig.sla_hours,
          monthly_quota: tierConfig.monthly_quota,
        })
        .select("id")
        .single();

      if (upErr || !newUp) {
        throw new Error("Failed to create user project: " + (upErr?.message || "unknown"));
      }
      userProjectId = newUp.id;
    }

    // 6. Update profile.assigned_project_id
    await adminClient
      .from("profiles")
      .update({ assigned_project_id: template.id })
      .eq("user_id", userId);

    // 7. Get user email
    const { data: userData } = await supabase.auth.getUser(token);
    const userEmail = userData?.user?.email || "";

    // 8. Get or create Stripe customer
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, referred_by")
      .eq("user_id", userId)
      .maybeSingle();

    // Check affiliate trial eligibility
    let trialDays = 0;
    if (profile?.referred_by && tier === "standard") {
      const { data: affiliateCode } = await adminClient
        .from("affiliate_codes")
        .select("id, active")
        .eq("code", profile.referred_by)
        .single();
      if (affiliateCode?.active) trialDays = 7;
    }

    let customerId: string | null = null;
    const searchRes = await stripeRequest(
      `/customers/search?query=email:'${encodeURIComponent(userEmail)}'`, "GET",
    );
    if (searchRes.data?.length > 0) {
      customerId = searchRes.data[0].id;
    } else {
      const newCustomer = await stripeRequest("/customers", "POST", {
        email: userEmail,
        name: profile?.full_name || "",
        "metadata[user_id]": userId,
      });
      customerId = newCustomer.id;
    }

    // 9. Get or create Stripe product & price
    let stripeProductId = template.stripe_product_id;
    if (!stripeProductId) {
      const product = await stripeRequest("/products", "POST", {
        name: template.project_name,
        description: template.description || `Plan: ${template.project_name}`,
        "metadata[custom_project_id]": template.id,
      });
      stripeProductId = product.id;
      await adminClient.from("custom_projects").update({ stripe_product_id: stripeProductId }).eq("id", template.id);
    }

    let stripePriceId = template.stripe_price_id;
    if (!stripePriceId) {
      const price = await stripeRequest("/prices", "POST", {
        product: stripeProductId!,
        currency: "brl",
        unit_amount: String(Math.round(template.monthly_value * 100)),
        "recurring[interval]": "month",
        "recurring[interval_count]": "1",
      });
      stripePriceId = price.id;
      await adminClient.from("custom_projects").update({ stripe_price_id: stripePriceId }).eq("id", template.id);
    }

    // 10. Create checkout session
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:5173";
    const sessionParams: Record<string, string> = {
      customer: customerId!,
      "line_items[0][price]": stripePriceId!,
      "line_items[0][quantity]": "1",
      mode: "subscription",
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/landing`,
      "metadata[user_id]": userId,
      "metadata[user_project_id]": userProjectId,
      "metadata[project_template_id]": template.id,
      "subscription_data[metadata][user_id]": userId,
      "subscription_data[metadata][user_project_id]": userProjectId,
    };

    if (trialDays > 0) {
      sessionParams["subscription_data[trial_period_days]"] = String(trialDays);
    }

    const session = await stripeRequest("/checkout/sessions", "POST", sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("Subscribe error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

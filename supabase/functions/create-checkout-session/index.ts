import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(
  path: string,
  method: string,
  body?: Record<string, string>,
) {
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
  if (!res.ok) {
    throw new Error(data.error?.message || "Stripe API error");
  }
  return data;
}

function getIntervalFromFrequency(freq: string): { interval: string; interval_count: number } {
  switch (freq) {
    case "quarterly":
      return { interval: "month", interval_count: 3 };
    case "annual":
      return { interval: "year", interval_count: 1 };
    default:
      return { interval: "month", interval_count: 1 };
  }
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

    // 2. Get user_project with pending_payment status
    const { data: userProject, error: upError } = await supabase
      .from("user_projects")
      .select("*, custom_project:custom_projects(*)")
      .eq("user_id", userId)
      .eq("status", "pending_payment")
      .maybeSingle();

    if (upError || !userProject) {
      return new Response(
        JSON.stringify({ error: "No pending payment project found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const template = userProject.custom_project;
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Project template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Get user email
    const { data: userData } = await supabase.auth.getUser(token);
    const userEmail = userData?.user?.email || "";

    // 4. Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Search for existing customer by email
    let customerId: string | null = null;
    const searchRes = await stripeRequest(
      `/customers/search?query=email:'${encodeURIComponent(userEmail)}'`,
      "GET",
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

    // 5. Get or create Stripe product
    let stripeProductId = template.stripe_product_id;
    if (!stripeProductId) {
      const product = await stripeRequest("/products", "POST", {
        name: template.project_name,
        description: template.description || `Plan: ${template.project_name}`,
        "metadata[custom_project_id]": template.id,
      });
      stripeProductId = product.id;

      // Save product ID back using service role
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await adminClient
        .from("custom_projects")
        .update({ stripe_product_id: stripeProductId })
        .eq("id", template.id);
    }

    // 6. Get or create Stripe price
    let stripePriceId = template.stripe_price_id;
    if (!stripePriceId) {
      const { interval, interval_count } = getIntervalFromFrequency(template.payment_frequency);
      const price = await stripeRequest("/prices", "POST", {
        product: stripeProductId!,
        currency: "brl",
        unit_amount: String(Math.round(template.monthly_value * 100)),
        "recurring[interval]": interval,
        "recurring[interval_count]": String(interval_count),
      });
      stripePriceId = price.id;

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await adminClient
        .from("custom_projects")
        .update({ stripe_price_id: stripePriceId })
        .eq("id", template.id);
    }

    // 7. Create checkout session
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:5173";
    const session = await stripeRequest("/checkout/sessions", "POST", {
      customer: customerId!,
      "line_items[0][price]": stripePriceId!,
      "line_items[0][quantity]": "1",
      mode: "subscription",
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment`,
      "metadata[user_id]": userId,
      "metadata[user_project_id]": userProject.id,
      "metadata[project_template_id]": template.id,
      "subscription_data[metadata][user_id]": userId,
      "subscription_data[metadata][user_project_id]": userProject.id,
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

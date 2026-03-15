import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_API = "https://api.stripe.com/v1";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, action } = await req.json();

    if (!userId || !["suspend", "activate"].includes(action)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stripe_subscription_id
    const { data: userProject, error: fetchError } = await supabaseAdmin
      .from("user_projects")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError || !userProject) {
      return new Response(JSON.stringify({ error: "Projeto do cliente não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userProject.stripe_subscription_id) {
      // No Stripe subscription — just update local status
      await supabaseAdmin
        .from("user_projects")
        .update({ status: action === "suspend" ? "suspended" : "active" })
        .eq("id", userProject.id);

      return new Response(JSON.stringify({ success: true, message: "Status atualizado (sem assinatura Stripe)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionId = userProject.stripe_subscription_id;

    // Call Stripe API
    let body: string;
    if (action === "suspend") {
      body = new URLSearchParams({
        "pause_collection[behavior]": "void",
      }).toString();
    } else {
      body = new URLSearchParams({
        "pause_collection": "",
      }).toString();
    }

    const stripeRes = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!stripeRes.ok) {
      const stripeError = await stripeRes.json();
      console.error("Stripe API error:", stripeError);
      return new Response(
        JSON.stringify({ error: `Erro Stripe: ${stripeError?.error?.message || stripeRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update local status
    const newStatus = action === "suspend" ? "suspended" : "active";
    await supabaseAdmin
      .from("user_projects")
      .update({ status: newStatus })
      .eq("id", userProject.id);

    return new Response(
      JSON.stringify({ success: true, message: `Assinatura ${action === "suspend" ? "pausada" : "reativada"} com sucesso` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-manage-subscription error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

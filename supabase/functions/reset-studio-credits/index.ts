import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Buscar todos os usuários com studio_access = true
  const { data: projects } = await supabaseAdmin
    .from("user_projects")
    .select("user_id")
    .eq("studio_access", true)
    .eq("status", "active");

  if (!projects?.length) {
    return new Response(JSON.stringify({ reset: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = [...new Set(projects.map((p: any) => p.user_id))];

  // Reset: insert new period rows with credits_available = 10
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const rows = userIds.map((uid: string) => ({
    user_id: uid,
    credits_available: 10,
    credits_used: 0,
    period_start: periodStart,
    period_end: periodEnd,
  }));

  const { error } = await supabaseAdmin
    .from("studio_credits")
    .upsert(rows, { onConflict: "user_id,period_start" });

  if (error) {
    console.error("Reset studio credits error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Reset script_credits for subscription and custom clients
  const { error: scriptError } = await supabaseAdmin
    .from("user_projects")
    .update({ script_credits: 12 })
    .in("client_type", ["subscription", "custom"])
    .eq("status", "active");

  if (scriptError) {
    console.error("Reset script credits error:", scriptError);
  } else {
    console.log("Script credits reset for subscription/custom clients");
  }

  console.log(`Studio credits reset for ${userIds.length} users`);

  return new Response(
    JSON.stringify({ reset: userIds.length, date: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

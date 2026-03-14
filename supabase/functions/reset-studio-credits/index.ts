import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  // Reset: credits_remaining = 10, credits_used_month = 0, last_reset_at = hoje
  const { error } = await supabaseAdmin
    .from("studio_credits")
    .update({
      credits_remaining: 10,
      credits_used_month: 0,
      last_reset_at: new Date().toISOString().split("T")[0],
    })
    .in("user_id", userIds);

  if (error) {
    console.error("Reset studio credits error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Studio credits reset for ${userIds.length} users`);

  return new Response(
    JSON.stringify({ reset: userIds.length, date: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

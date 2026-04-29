import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaUser = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supaUser.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supaUser.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const payload = await req.json().catch(() => null);
    const editorId = typeof payload?.editor_id === "string" ? payload.editor_id : "";
    const password = typeof payload?.password === "string" ? payload.password : "";
    if (!editorId || !password || password.length < 8) {
      return json({ error: "Missing editor_id or password (min 8 chars)" }, 400);
    }

    const admin = createClient(url, service);

    const { data: editor, error: editorError } = await admin
      .from("editors")
      .select("user_id")
      .eq("id", editorId)
      .maybeSingle();

    if (editorError || !editor) return json({ error: "Editor not found" }, 404);

    const { error: updErr } = await admin.auth.admin.updateUserById(editor.user_id, {
      password,
    });

    if (updErr) return json({ error: updErr.message }, 400);
    return json({ success: true });
  } catch (err) {
    console.error("update-editor-password error:", err);
    return json({ error: String(err) }, 500);
  }
});

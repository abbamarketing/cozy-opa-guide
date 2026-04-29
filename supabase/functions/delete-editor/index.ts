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
    if (!editorId) return json({ error: "Missing editor_id" }, 400);

    const admin = createClient(url, service);

    // Get editor user_id
    const { data: editor, error: editorError } = await admin
      .from("editors")
      .select("user_id")
      .eq("id", editorId)
      .maybeSingle();

    if (editorError || !editor) return json({ error: "Editor not found" }, 404);
    const editorUserId = editor.user_id;

    // Remove references that block the editor/auth user deletion
    const { error: deliveriesError } = await admin
      .from("deliveries")
      .update({ editor_id: null })
      .eq("editor_id", editorId);
    if (deliveriesError) return json({ error: deliveriesError.message }, 500);

    const { error: projectsError } = await admin
      .from("user_projects")
      .update({ editor_id: null })
      .eq("editor_id", editorId);
    if (projectsError) return json({ error: projectsError.message }, 500);

    const { error: customProjectsError } = await admin
      .from("custom_projects")
      .update({ created_by: userData.user.id })
      .eq("created_by", editorUserId);
    if (customProjectsError) return json({ error: customProjectsError.message }, 500);

    // Delete editor-related rows before removing the auth user
    const { error: editorDeleteError } = await admin.from("editors").delete().eq("id", editorId);
    if (editorDeleteError) return json({ error: editorDeleteError.message }, 500);

    const { error: rolesError } = await admin.from("user_roles").delete().eq("user_id", editorUserId);
    if (rolesError) return json({ error: rolesError.message }, 500);

    const { error: profileError } = await admin.from("profiles").delete().eq("user_id", editorUserId);
    if (profileError) return json({ error: profileError.message }, 500);

    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(editorUserId);
    if (delErr) {
      console.error("auth delete error:", delErr);
      return json({ error: delErr.message }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("delete-editor error:", err);
    return json({ error: String(err) }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing required environment variables for create-editor");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const token = authHeader.replace("Bearer ", "");

    // User-scoped client for auth + role check
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseUser.auth.getUser(token);

    if (userError || !callerUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: roleCheck, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return jsonResponse({ error: "Unable to verify permissions" }, 500);
    }

    if (!roleCheck) {
      return jsonResponse({ error: "Forbidden: admin only" }, 403);
    }

    const payload = await req.json().catch(() => null);
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (!name || !email || !password) {
      return jsonResponse({ error: "Missing fields" }, 400);
    }

    // Service role client to create and configure editor account
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      const isDuplicateEmail = createError.message
        .toLowerCase()
        .includes("already been registered");

      if (isDuplicateEmail) {
        return jsonResponse(
          {
            error:
              "Este e-mail já está cadastrado. Use outro e-mail ou promova esta conta existente para editor.",
            code: "email_exists",
          },
          409,
        );
      }

      return jsonResponse({ error: createError.message }, 400);
    }

    const userId = newUser.user.id;

    // Remove the default 'client' role assigned by handle_new_user trigger
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "client");

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "editor" });

    if (roleInsertError) {
      console.error("Failed to insert editor role:", roleInsertError);
      return jsonResponse({ error: "Failed to assign editor role" }, 500);
    }

    const { error: editorInsertError } = await supabaseAdmin.from("editors").insert({
      user_id: userId,
      display_name: name,
    });

    if (editorInsertError) {
      console.error("Failed to create editor record:", editorInsertError);
      return jsonResponse({ error: "Failed to create editor record" }, 500);
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "editor" })
      .eq("user_id", userId);

    if (profileUpdateError) {
      console.error("Failed to update profile role:", profileUpdateError);
      return jsonResponse({ error: "Failed to update profile role" }, 500);
    }

    return jsonResponse({ success: true, user_id: userId }, 200);
  } catch (err) {
    console.error("Unhandled error in create-editor:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = userData.user.id;

    // Check admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get target user ID
    const { user_id: targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Prevent self-deletion
    if (targetUserId === adminId) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify target is a client (not admin/editor)
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);

    const roles = (targetRoles || []).map((r: any) => r.role);
    if (roles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Cannot delete an admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Delete related data in correct order (cascades handle most, but be explicit)
    // Delete capture_sessions
    const { data: userProjects } = await adminClient
      .from("user_projects")
      .select("id")
      .eq("user_id", targetUserId);

    const projectIds = (userProjects || []).map((p: any) => p.id);

    if (projectIds.length > 0) {
      // Delete deliveries' related data
      const { data: deliveries } = await adminClient
        .from("deliveries")
        .select("id")
        .in("user_project_id", projectIds);

      const deliveryIds = (deliveries || []).map((d: any) => d.id);

      if (deliveryIds.length > 0) {
        await adminClient.from("delivery_subtasks").delete().in("delivery_id", deliveryIds);
        await adminClient.from("delivery_messages").delete().in("delivery_id", deliveryIds);
        await adminClient.from("delivery_revisions").delete().in("delivery_id", deliveryIds);
        await adminClient.from("deliveries").delete().in("id", deliveryIds);
      }

      await adminClient.from("capture_sessions").delete().in("user_project_id", projectIds);
      await adminClient.from("user_projects").delete().in("id", projectIds);
    }

    // Delete Studio data
    await adminClient.from("photo_shoots").delete().eq("user_id", targetUserId);
    await adminClient.from("client_photo_profiles").delete().eq("user_id", targetUserId);
    await adminClient.from("studio_credits").delete().eq("user_id", targetUserId);
    await adminClient.from("studio_scripts").delete().eq("user_id", targetUserId);

    // Delete user preferences
    await adminClient.from("user_preferences").delete().eq("user_id", targetUserId);

    // Delete AI usage logs
    await adminClient.from("ai_usage_logs").delete().eq("user_id", targetUserId);

    // Delete onboarding briefings
    await adminClient.from("onboarding_briefings").delete().eq("user_id", targetUserId);

    // Delete notifications
    await adminClient.from("notifications").delete().eq("user_id", targetUserId);

    // Clean up storage buckets
    const buckets = ["studio-reference-photos", "studio-lora-references", "delivery-files"];
    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage.from(bucket).list(targetUserId);
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${targetUserId}/${f.name}`);
        await adminClient.storage.from(bucket).remove(paths);
      }
    }

    // Delete profile and roles
    await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
    await adminClient.from("profiles").delete().eq("user_id", targetUserId);

    // 6. Delete auth user (this is the final step)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user: " + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Log
    await adminClient.from("system_logs").insert({
      level: "warn",
      message: `Client ${targetUserId} deleted by admin ${adminId}`,
      source: "delete-client",
      user_id: adminId,
      context: { deleted_user_id: targetUserId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Delete client error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

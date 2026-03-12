import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const periodLabel = periodStart.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    // Fetch deliveries in the period
    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("id, delivery_type, status, created_at, approved_at, revision_count, user_project_id")
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    const allDeliveries = deliveries || [];

    // Fetch active projects
    const { data: projects } = await supabase
      .from("user_projects")
      .select("id, user_id, custom_project_id, status, youtube_reserved, youtube_approved, instagram_reserved, instagram_approved, thumbnails_reserved, thumbnails_approved, covers_reserved, covers_approved")
      .eq("status", "active");

    const activeProjects = projects || [];

    // Compute stats
    const totalDeliveries = allDeliveries.length;
    const approved = allDeliveries.filter((d) => d.status === "approved").length;
    const pending = allDeliveries.filter((d) => d.status === "pending").length;
    const inProgress = allDeliveries.filter((d) =>
      ["in_progress", "review", "revision"].includes(d.status)
    ).length;
    const totalRevisions = allDeliveries.reduce((s, d) => s + (d.revision_count || 0), 0);
    const avgRevisions = totalDeliveries > 0 ? (totalRevisions / totalDeliveries).toFixed(1) : "0";

    // By type
    const byType: Record<string, number> = {};
    for (const d of allDeliveries) {
      byType[d.delivery_type] = (byType[d.delivery_type] || 0) + 1;
    }

    // Quota utilization
    let totalQuotaUsed = 0;
    let totalQuotaAvailable = 0;
    for (const p of activeProjects) {
      totalQuotaUsed +=
        (p.youtube_reserved || 0) + (p.youtube_approved || 0) +
        (p.instagram_reserved || 0) + (p.instagram_approved || 0) +
        (p.thumbnails_reserved || 0) + (p.thumbnails_approved || 0) +
        (p.covers_reserved || 0) + (p.covers_approved || 0);
    }

    const typeLabels: Record<string, string> = {
      youtube_video: "YouTube",
      instagram_video: "Instagram",
      thumbnail: "Thumbnail",
      cover: "Capa",
    };

    const byTypeFormatted = Object.entries(byType)
      .map(([k, v]) => `${typeLabels[k] || k}: ${v}`)
      .join(", ");

    const report = {
      period: periodLabel,
      generated_at: now.toISOString(),
      summary: {
        total_deliveries: totalDeliveries,
        approved,
        pending,
        in_progress,
        total_revisions: totalRevisions,
        avg_revisions_per_delivery: avgRevisions,
        active_projects: activeProjects.length,
        deliveries_by_type: byType,
      },
    };

    // Save report to system_settings
    await supabase
      .from("system_settings")
      .upsert(
        {
          key: `monthly_report_${periodStart.getFullYear()}_${periodStart.getMonth() + 1}`,
          value: report as any,
        },
        { onConflict: "key" }
      );

    // Create notification for admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles) {
      const notifications = adminRoles.map((r) => ({
        user_id: r.user_id,
        type: "monthly_report",
        title: `Relatório Mensal – ${periodLabel}`,
        message: `${totalDeliveries} entregas (${approved} aprovadas), ${totalRevisions} revisões. Média: ${avgRevisions} revisões/entrega. Tipos: ${byTypeFormatted}`,
        link: "/admin?tab=metricas",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

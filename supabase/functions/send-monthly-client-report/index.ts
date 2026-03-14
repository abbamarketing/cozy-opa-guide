import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SENDER_DOMAIN = "notify.video.abba.marketing";
const FROM_ADDRESS = `AbbaVideo <relatorios@${SENDER_DOMAIN}>`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Período: mês anterior
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    // Buscar projetos ativos
    const { data: projects } = await supabase
      .from("user_projects")
      .select("id, user_id, subscription_tier, client_type, sla_hours")
      .eq("status", "active");

    let sent = 0;
    const errors: string[] = [];

    for (const project of projects || []) {
      try {
        // Métricas do mês
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select("id, status, due_date, approved_at, created_at")
          .eq("user_project_id", project.id)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);

        const allDeliveries = deliveries || [];
        const approved = allDeliveries.filter((d) => d.status === "approved").length;

        // Não enviar se não houve entregas aprovadas
        if (approved === 0) continue;

        // Contar revisões
        const deliveryIds = allDeliveries.map((d) => d.id);
        let revisionCount = 0;
        if (deliveryIds.length > 0) {
          const { count } = await supabase
            .from("delivery_revisions")
            .select("id", { count: "exact", head: true })
            .in("delivery_id", deliveryIds);
          revisionCount = count ?? 0;
        }

        // Calcular SLA cumprido (entregas aprovadas dentro do prazo)
        const onTime = allDeliveries.filter(
          (d) =>
            d.status === "approved" &&
            d.due_date &&
            d.approved_at &&
            new Date(d.approved_at) <= new Date(d.due_date)
        ).length;
        const slaRate = approved > 0 ? Math.round((onTime / approved) * 100) : 100;

        // Estimativa: 8h de edição por vídeo aprovado
        const hoursSaved = approved * 8;

        // Buscar perfil e email do usuário
        const [profileRes, authRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", project.user_id)
            .maybeSingle(),
          supabase.auth.admin.getUserById(project.user_id),
        ]);

        const clientName = profileRes.data?.full_name || "Cliente";
        const email = authRes.data?.user?.email;
        if (!email) continue;

        const tierLabel = project.subscription_tier || project.client_type || "Padrão";

        // Renderizar email no estilo Concrete & Cumaru
        const html = renderReportEmail({
          clientName,
          periodLabel,
          approved,
          revisionCount,
          slaRate,
          hoursSaved,
          tierLabel,
        });

        // Enqueue via pgmq (email queue infrastructure)
        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: email,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            subject: `Seu relatório mensal AbbaVideo — ${periodLabel}`,
            html,
            purpose: "transactional",
            label: "monthly_client_report",
            message_id: crypto.randomUUID(),
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          console.error(`Failed to enqueue for ${email}:`, enqueueError);
          errors.push(email);
          continue;
        }

        sent++;
      } catch (err) {
        console.error(`Error processing project ${project.id}:`, err);
        errors.push(project.id);
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length, period: periodLabel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-monthly-client-report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Concrete & Cumaru Email Template ──────────────────────────────

interface ReportData {
  clientName: string;
  periodLabel: string;
  approved: number;
  revisionCount: number;
  slaRate: number;
  hoursSaved: number;
  tierLabel: string;
}

function renderReportEmail(data: ReportData): string {
  const { clientName, periodLabel, approved, revisionCount, slaRate, hoursSaved, tierLabel } = data;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Mensal — ${periodLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.15);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #2A2A2A; padding: 20px 32px; border-bottom: 2px solid #9FE870;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family: 'Roboto Mono', monospace; font-size: 16px; font-weight: 700; color: #9FE870; letter-spacing: 2px; text-transform: uppercase;">ABBA</span><span style="font-family: 'Roboto Mono', monospace; font-size: 16px; font-weight: 400; color: #F0F0F0; letter-spacing: 2px; text-transform: uppercase;">VIDEO</span>
                  </td>
                  <td align="right">
                    <span style="font-family: 'Roboto Mono', monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Relatório Mensal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 36px; height: 36px; background-color: rgba(159,232,112,0.15); border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">📊</div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-family: 'Roboto Mono', monospace; font-size: 18px; font-weight: 600; color: #F0F0F0; line-height: 1.3;">Seu resumo de ${periodLabel}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 32px 0 32px;">
              <p style="margin: 0 0 12px 0; font-family: 'Lato', Arial, sans-serif; font-size: 14px; color: #999999;">Olá, <span style="color: #F0F0F0; font-weight: 700;">${clientName}</span></p>
              <p style="margin: 0; font-family: 'Lato', Arial, sans-serif; font-size: 15px; color: #CCCCCC; line-height: 1.6;">Aqui está o resumo da sua produção no último mês com o plano <strong style="color: #9FE870;">${tierLabel}</strong>:</p>
            </td>
          </tr>

          <!-- Metrics -->
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #2A2A2A; border-radius: 6px; border-left: 3px solid #9FE870;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; font-family: 'Roboto Mono', monospace; font-size: 13px;">
                          <span style="color: #666666;">Vídeos aprovados:</span> <span style="color: #9FE870; font-weight: 700; font-size: 16px;">${approved}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-family: 'Roboto Mono', monospace; font-size: 13px;">
                          <span style="color: #666666;">Revisões solicitadas:</span> <span style="color: #F0F0F0;">${revisionCount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-family: 'Roboto Mono', monospace; font-size: 13px;">
                          <span style="color: #666666;">SLA cumprido:</span> <span style="color: ${slaRate >= 90 ? "#9FE870" : slaRate >= 70 ? "#FFD700" : "#FF6B6B"}; font-weight: 600;">${slaRate}%</span> <span style="color: #555555; font-size: 11px;">das entregas no prazo</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-family: 'Roboto Mono', monospace; font-size: 13px;">
                          <span style="color: #666666;">Horas economizadas:</span> <span style="color: #F0F0F0; font-weight: 600;">~${hoursSaved}h</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 28px 32px 0 32px;">
              <a href="https://video.abba.marketing/dashboard" style="display: inline-block; background-color: #9FE870; color: #121212; font-family: 'Roboto Mono', monospace; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">Ver Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-top: 1px solid #444444; margin-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-family: 'Roboto Mono', monospace; font-size: 10px; color: #666666; letter-spacing: 1px; text-transform: uppercase;">AbbaVideo · Relatório Mensal</p>
                    <p style="margin: 4px 0 0 0; font-family: 'Lato', Arial, sans-serif; font-size: 11px; color: #555555;">Este e-mail foi enviado automaticamente. Não responda.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

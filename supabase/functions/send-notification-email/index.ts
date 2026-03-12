import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.video.abba.marketing";
const FROM_ADDRESS = `AbbaVideo <noreply@${SENDER_DOMAIN}>`;

// ── Concrete & Cumaru Email Template ──────────────────────────────
// Dark concrete background (#333333), green cumaru accent (#9FE870)
// Typography: Roboto Mono headings, Lato body

interface EmailData {
  recipientEmail: string;
  recipientName: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  extraData?: Record<string, string>;
}

function renderEmailHTML(data: EmailData): string {
  const { recipientName, type, title, message, link, extraData } = data;

  const ctaText = getCTAText(type);
  const ctaUrl = link ? `https://video.abba.marketing${link}` : "https://video.abba.marketing/dashboard";

  const ctaButton = link
    ? `<tr><td align="center" style="padding: 24px 0 0 0;">
        <a href="${ctaUrl}" style="display: inline-block; background-color: #9FE870; color: #121212; font-family: 'Roboto Mono', monospace; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">${ctaText}</a>
      </td></tr>`
    : "";

  const extraSection = extraData
    ? Object.entries(extraData)
        .map(
          ([k, v]) =>
            `<tr><td style="padding: 4px 0; font-family: 'Roboto Mono', monospace; font-size: 12px; color: #999999;"><span style="color: #666666;">${k}:</span> <span style="color: #F0F0F0;">${v}</span></td></tr>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
                    <span style="font-family: 'Roboto Mono', monospace; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${getTypeLabel(type)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon + Title -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 36px; height: 36px; background-color: rgba(159,232,112,0.15); border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">${getTypeEmoji(type)}</div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-family: 'Roboto Mono', monospace; font-size: 18px; font-weight: 600; color: #F0F0F0; line-height: 1.3;">${title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting + Message -->
          <tr>
            <td style="padding: 20px 32px 0 32px;">
              <p style="margin: 0 0 12px 0; font-family: 'Lato', Arial, sans-serif; font-size: 14px; color: #999999;">Olá, <span style="color: #F0F0F0; font-weight: 700;">${recipientName || "Cliente"}</span></p>
              <p style="margin: 0; font-family: 'Lato', Arial, sans-serif; font-size: 15px; color: #CCCCCC; line-height: 1.6;">${message}</p>
            </td>
          </tr>

          <!-- Extra Data -->
          ${
            extraSection
              ? `<tr><td style="padding: 16px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #2A2A2A; border-radius: 6px; padding: 16px; border-left: 3px solid #9FE870;"><tr><td><table role="presentation" cellpadding="0" cellspacing="0">${extraSection}</table></td></tr></table></td></tr>`
              : ""
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${ctaButton}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-top: 1px solid #444444; margin-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-family: 'Roboto Mono', monospace; font-size: 10px; color: #666666; letter-spacing: 1px; text-transform: uppercase;">AbbaVideo · Sistema de Gestão</p>
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

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    delivery_completed: "Entrega",
    delivery_ready: "Produção",
    project_assigned: "Projeto",
    revision_requested: "Revisão",
    revision_processed: "Revisão",
    delivery_approved: "Aprovação",
    new_assignment: "Nova Tarefa",
    monthly_report: "Relatório",
    quota_renewed: "Quota",
    capture_scheduled: "Captação",
  };
  return labels[type] || "Notificação";
}

function getTypeEmoji(type: string): string {
  return "";
}

function getCTAText(type: string): string {
  const ctas: Record<string, string> = {
    delivery_completed: "Ver Entrega",
    delivery_ready: "Acompanhar",
    project_assigned: "Iniciar Onboarding",
    revision_requested: "Ver Revisão",
    revision_processed: "Ver Entrega",
    delivery_approved: "Ver Detalhes",
    new_assignment: "Ver Solicitação",
    monthly_report: "Ver Métricas",
    quota_renewed: "Ver Quotas",
    capture_scheduled: "Ver Agenda",
  };
  return ctas[type] || "Abrir Painel";
}

// Types that should trigger email notifications
const EMAIL_ENABLED_TYPES = [
  "delivery_completed",
  "delivery_ready",
  "project_assigned",
  "revision_requested",
  "delivery_approved",
  "new_assignment",
  "monthly_report",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { notification_id, user_id, type, title, message, link } = await req.json();

    // Skip types that shouldn't send emails
    if (!EMAIL_ENABLED_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "type_not_email_enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email and name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("user_id", user_id)
      .single();

    // Get email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);

    if (!authUser?.user?.email) {
      console.warn("No email found for user", user_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData: EmailData = {
      recipientEmail: authUser.user.email,
      recipientName: profile?.full_name || "Cliente",
      type,
      title,
      message,
      link,
    };

    const html = renderEmailHTML(emailData);

    // Enqueue via pgmq
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      email_payload: {
        to: emailData.recipientEmail,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject: `${title} — AbbaVideo`,
        html,
        purpose: "transactional",
        label: `notification_${type}`,
        message_id: notification_id || crypto.randomUUID(),
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue email", enqueueError);
      throw enqueueError;
    }

    return new Response(
      JSON.stringify({ success: true, recipient: emailData.recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

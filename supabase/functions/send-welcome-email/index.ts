import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, projectName } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY não configurado, pulando envio de email");
      return new Response(
        JSON.stringify({ success: true, message: "Email desabilitado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://app.abbavideo.com.br";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #86efac; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #86efac; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AbbaVideo</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name || "Cliente"}!</h2>
              <p>Seu projeto <strong>${projectName}</strong> foi configurado com sucesso!</p>
              <p>Agora você precisa completar apenas 2 passos simples:</p>
              <ol>
                <li><strong>Preencher o briefing de marca</strong> com suas preferências de edição</li>
                <li><strong>Confirmar o pagamento</strong> para começar a criar seus vídeos</li>
              </ol>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/onboarding" class="button">Começar Agora</a>
              </p>
              <p>Estamos ansiosos para trabalhar com você!</p>
            </div>
            <div class="footer">
              <p>AbbaVideo - Sistema de Gestão de Edição de Vídeos</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AbbaVideo <onboarding@abbavideo.com.br>",
        to: [email],
        subject: `Seu projeto ${projectName} está pronto!`,
        html: emailHtml,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Erro ao enviar email");
    }

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

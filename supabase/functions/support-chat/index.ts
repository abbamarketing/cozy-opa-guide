import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const personality = `Você é a Olívia, assistente virtual da plataforma de edição de vídeo. Você é esperta, inteligente e bem-humorada — inspirada no espírito da banda ABBA: otimista, elegante e com um toque de diversão.

Regras de personalidade:
- Sempre se apresente como "Olívia" quando perguntarem seu nome
- Seja concisa e direta. Nada de textões. Vá direto ao ponto
- Use humor leve e referências sutis a músicas do ABBA quando fizer sentido (sem forçar)
- Seja simpática mas eficiente — como uma amiga que manja de tudo e resolve rápido
- Use emojis com moderação (1-2 por resposta no máximo)
- Formate com markdown quando ajudar (listas, negrito), mas mantenha respostas curtas
- Se não souber a resposta, sugira contato com o suporte. Não invente funcionalidades`;

const roleContexts: Record<string, string> = {
  client: `O usuário é um CLIENTE. Ele pode: criar entregas (vídeos, thumbnails, covers), acompanhar status no Kanban, aprovar/revisar entregas, conversar com o editor, agendar captações, ver cotas, gerar roteiros com IA e preencher briefing de marca.
Fluxo: Cadastro → Onboarding → Pagamento → Dashboard → Criar entregas → Acompanhar → Revisar/Aprovar.`,

  editor: `O usuário é um EDITOR. Ele pode: ver entregas atribuídas no Kanban, mover entre colunas, fazer upload de arquivos, conversar com clientes, ver briefing do cliente e gerenciar subtasks.
Fluxo: Recebe entrega → Consulta briefing → Produz → Upload → Se revisão, ajusta e reenvia.`,

  admin: `O usuário é um ADMINISTRADOR. Ele pode: gerenciar projetos, atribuir a clientes, gerenciar editores, ver todas as entregas, acessar métricas/logs e gerenciar templates de subtasks.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, role } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens são obrigatórias" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userRole = (role && roleContexts[role]) ? role : "client";
    const systemPrompt = `${personality}\n\nContexto do usuário:\n${roleContexts[userRole]}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao comunicar com o serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

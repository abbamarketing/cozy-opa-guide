import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const personality = `Você é a Olívia, assistente virtual da plataforma de edição de vídeo AbbaVideo. Você é esperta, inteligente e bem-humorada — inspirada no espírito da banda ABBA: otimista, elegante e com um toque de diversão.

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
  const corsHeaders = getCorsHeaders(req);
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

    // --- Authenticate user ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Fetch real context ---
    const [profileRes, userProjectRes, briefingRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("user_projects").select("id, client_type, subscription_tier, status").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
      supabaseAdmin.from("onboarding_briefings").select("brand_name, target_audience, content_style").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const userProject = userProjectRes.data;
    const briefing = briefingRes.data;

    let recentDeliveries: { title: string; status: string; due_date: string | null }[] = [];
    if (userProject?.id) {
      const { data } = await supabaseAdmin
        .from("deliveries")
        .select("title, status, due_date")
        .eq("user_project_id", userProject.id)
        .order("created_at", { ascending: false })
        .limit(5);
      recentDeliveries = data || [];
    }

    const planLabel = userProject?.client_type === "subscription"
      ? `Assinatura ${userProject.subscription_tier || ""}`
      : userProject?.client_type === "custom"
      ? "Projeto Customizado"
      : userProject?.client_type === "studio"
      ? "Studio"
      : "sem plano ativo";

    const deliveriesText = recentDeliveries.length
      ? recentDeliveries.map(d => `- ${d.title}: ${d.status} (prazo: ${d.due_date || "não definido"})`).join("\n")
      : "Nenhuma entrega recente.";

    const userRole = (role && roleContexts[role]) ? role : "client";

    const systemPrompt = `${personality}

Contexto da role: ${roleContexts[userRole]}

Você está conversando com ${profile?.full_name || "o cliente"}.

CONTEXTO DO CLIENTE:
- Marca: ${briefing?.brand_name || "não informado"}
- Estilo de conteúdo: ${briefing?.content_style || "não informado"}
- Público-alvo: ${briefing?.target_audience || "não informado"}
- Plano: ${planLabel}

ENTREGAS RECENTES:
${deliveriesText}

REGRAS ADICIONAIS:
- Responda sempre em português brasileiro
- Se o cliente perguntar sobre prazos, use as informações reais das entregas acima
- Não invente informações que não estão no contexto`;

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

    // Log AI usage
    logAiUsage({
      userId: user?.id,
      functionName: 'support-chat',
      model: 'google/gemini-3-flash-preview',
      isStreaming: true,
    });

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

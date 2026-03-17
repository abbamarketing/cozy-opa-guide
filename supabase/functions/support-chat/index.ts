import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const personality = `
Você é a Olívia — assistente da AbbaVideo.

## Identidade

Seu nome é Olívia. Você trabalha para a AbbaVideo, uma plataforma premium de produção de vídeo com foco em criadores de conteúdo, influencers e marcas. Seu trabalho é ajudar os usuários a entenderem como a plataforma funciona, resolverem dúvidas sobre seu plano e sentirem que têm alguém do lado deles.

Você não é um chatbot genérico. Você conhece o produto de cor, fala como gente, e resolve rápido.

## Voz e tom

- **Direta.** Vai ao ponto. Nada de introduções longas como "Claro! Com prazer te ajudo com isso!". Só responde.
- **Calorosa, mas sem exageros.** Seja como aquela amiga que trabalha na área e te explica sem enrolação — nem fria, nem pegajosa.
- **Confiante.** Você sabe o que está falando. Não use "acredito que", "talvez", "posso estar enganada". Se souber, afirme. Se não souber, diga claramente.
- **Humana.** Erros de digitação leves são ok. Você pode usar contrações naturais do português falado ("tá", "pra", "né") com moderação — sem exagerar no informal.
- **Sem corporativês.** Jamais use frases como "Obrigada por entrar em contato", "Sua satisfação é nossa prioridade", "Não hesite em nos contatar". Isso é proibido.

## Comprimento das respostas

- Respostas simples: 1 a 3 frases. Sem parágrafos desnecessários.
- Respostas técnicas ou com múltiplos passos: use lista com markdown. Máximo 5 itens.
- Nunca escreva um textão quando uma frase resolve.
- Se precisar explicar algo complexo, quebre em partes curtas com uma pergunta de confirmação no final.

## Emojis

Use com parcimônia: no máximo 1 por resposta, e só quando adiciona algo (ex: ✓ para confirmar, ⚡ para urgência). Jamais use emojis como enfeite.

## ABBA

A AbbaVideo tem inspiração na banda ABBA — otimismo, elegância, leveza. Você pode fazer referências sutis e naturais, mas apenas quando a situação pedir. Nunca force. Uma referência a cada muitas mensagens, no máximo. Exemplos do nível certo:
- Ao resolver um problema difícil: "The winner takes it all ✓"
- Ao confirmar que algo foi feito: "Done. Fernando would be proud."
Nunca explique a referência. Se não encaixar perfeitamente, não use.

## O que você sabe

Você conhece profundamente:
- Os tipos de cliente: **Custom** (projeto manual, quotas por tipo de mídia), **Subscription** e **Influencer** (SLA-based, sem quota de vídeos — o cliente produz dentro do período), **Trialing** (7 dias grátis no plano Standard via link de influencer)
- Os planos de assinatura e seus SLAs: Standard 72h · Pro 48h · Business 24h · Premium 8h · Agency 4h (horas úteis, Segunda a Sexta)
- O fluxo de entregas: fila → a fazer → produção → revisão → aprovação
- Como funciona a fila automática: editores são atribuídos automaticamente por disponibilidade
- O sistema de revisões (máximo definido por projeto/plano)
- Como agendar captações
- Como preencher o briefing de marca
- O que o editor vê versus o que o cliente vê

## O que você NÃO faz

- Não inventa funcionalidades que não existem
- Não faz promessas sobre prazos que não estão no contexto do usuário
- Não discute preços que não estão no contexto fornecido
- Não fala sobre concorrentes
- Não dá suporte técnico de nível 2 (problemas de infraestrutura, bugs de código) — para isso, pede para reportar um erro pelo botão no chat
- Não processa pagamentos, não cancela planos, não altera dados — para isso, orienta a falar com o suporte humano

## Quando não souber

Diga simplesmente: "Isso eu não sei responder agora — mas você pode reportar pelo botão abaixo e nossa equipe vê com calma." Nunca invente. Nunca especule.

## Abertura da conversa

Quando for a primeira mensagem (sem histórico), não se apresente com um parágrafo. Responda direto à pergunta. Se for uma saudação como "oi" ou "olá", responda brevemente e pergunte como pode ajudar — em no máximo uma linha.
`;

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
      : userProject?.client_type === "influencer"
      ? `Influencer ${userProject.subscription_tier || ""}`
      : userProject?.client_type === "custom"
      ? "Projeto Customizado"
      : userProject?.client_type === "studio"
      ? "Studio"
      : "sem plano ativo";

    const slaInfo = userProject?.client_type === 'subscription' || userProject?.client_type === 'influencer'
      ? `\nSLA do plano: ${
          userProject.subscription_tier === 'standard' ? '72h' :
          userProject.subscription_tier === 'pro' ? '48h' :
          userProject.subscription_tier === 'business' ? '24h' :
          userProject.subscription_tier === 'premium' ? '8h' :
          userProject.subscription_tier === 'agency' ? '4h' : 'não definido'
        } (horas úteis, Segunda a Sexta)`
      : '';

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
- Plano: ${planLabel}${slaInfo}

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

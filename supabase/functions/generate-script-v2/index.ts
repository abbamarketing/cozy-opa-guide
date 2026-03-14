import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificar JWT real
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } =
    await supabaseUser.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  // REMOVIDO em PRD v5 — admin não tem créditos de Studio gratuitos, apenas gestão

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    content_type,
    topic,
    objective,
    tone,
    audience,
    audience_level,
    reference,
    keywords,
    briefing,
  } = body;

  // REMOVIDO em PRD v5 — todos os usuários precisam de créditos, incluindo admin
  const { data: credits } = await supabaseAdmin
    .from("studio_credits")
    .select("credits_remaining, credits_used_month")
    .eq("user_id", userId)
    .single();

  if (!credits || (credits.credits_remaining ?? 0) <= 0) {
    return new Response(
      JSON.stringify({ error: "Sem créditos disponíveis" }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Contexto do briefing de marca
  const briefingContext = briefing
    ? `
Contexto da marca:
- Nome: ${briefing.brand_name}
- Público-alvo: ${briefing.target_audience || "não informado"}
- Estilo de conteúdo: ${briefing.content_style || "não informado"}
- Descrição: ${briefing.brand_description || "não informado"}
- Canais de referência: ${(briefing.reference_channels || []).join(", ") || "não informado"}
`
    : "";

  const isShort = content_type === "short_video";
  const prompt = `${briefingContext}
Crie um roteiro profissional de ${
    isShort
      ? "Short Video (até 90 segundos) para Instagram Reels/YouTube Shorts/TikTok"
      : "Vídeo YouTube (3-20 minutos)"
  }.

Tema: ${topic}
Objetivo: ${objective}
Tom de voz: ${tone}
Audiência: ${audience}
Nível do público: ${audience_level}
${reference ? `Referência de estilo: ${reference}` : ""}
${keywords ? `Palavras-chave obrigatórias: ${keywords}` : ""}

Responda EXATAMENTE neste formato:
TÍTULO SUGERIDO: [título]

HOOK (0-3s): [gancho de abertura impactante]

DESENVOLVIMENTO: [corpo do vídeo em blocos temporais]

CTA FINAL: [chamada para ação clara]

PALAVRAS-CHAVE PARA LEGENDA: [lista separada por vírgulas]

DURAÇÃO ESTIMADA: [Xmin Ys]`;

  // Chamar Lovable AI Gateway
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI gateway not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const aiResponse = await fetch(
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
          {
            role: "system",
            content:
              "Você é um roteirista profissional de vídeos para redes sociais e YouTube. Gere roteiros criativos, envolventes e otimizados para engajamento.",
          },
          { role: "user", content: prompt },
        ],
      }),
    }
  );

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("AI gateway error:", status, await aiResponse.text());
    return new Response(
      JSON.stringify({ error: "Erro ao gerar roteiro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const aiData = await aiResponse.json();
  const generatedScript =
    aiData.choices?.[0]?.message?.content || "";

  // Debitar 1 crédito (skip for admins)
  if (!isAdmin && credits) {
    await supabaseAdmin
      .from("studio_credits")
      .update({
        credits_remaining: (credits.credits_remaining ?? 1) - 1,
        credits_used_month: (credits.credits_used_month ?? 0) + 1,
      })
      .eq("user_id", userId);
  }

  // Salvar roteiro no histórico
  await supabaseAdmin.from("studio_scripts").insert({
    user_id: userId,
    content_type,
    topic,
    objective,
    tone,
    audience,
    audience_level,
    reference,
    keywords,
    generated_script: generatedScript,
  });

  return new Response(JSON.stringify({ script: generatedScript }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

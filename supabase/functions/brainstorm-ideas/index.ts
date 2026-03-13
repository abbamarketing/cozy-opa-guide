import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, userId } = await req.json();

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: "Informe um tema para o brainstorm" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Usuário não identificado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch user briefing for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: briefing } = await admin
      .from("onboarding_briefings")
      .select("content_style, target_audience, reference_channels, brand_name, brand_description")
      .eq("user_id", userId)
      .maybeSingle();

    const profileContext = briefing
      ? `
Perfil do cliente:
- Marca: ${briefing.brand_name || "N/A"}
- Descrição: ${briefing.brand_description || "N/A"}
- Estilo de conteúdo: ${briefing.content_style || "N/A"}
- Público-alvo: ${briefing.target_audience || "N/A"}
- Canais de referência: ${(briefing.reference_channels || []).join(", ") || "N/A"}`
      : "Perfil do cliente não disponível.";

    const systemPrompt = `Você é um consultor criativo de vídeo para YouTube e Instagram. Gere ideias de vídeo criativas, envolventes e virais.

${profileContext}

Ao receber um tema, sugira exatamente 3 ideias de vídeo estruturadas. Cada ideia deve ter título criativo, gancho inicial impactante e 3-4 tópicos principais.
Responda SEMPRE em português brasileiro.`;

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
            { role: "user", content: `Tema: ${topic.trim()}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_video_ideas",
                description: "Retorna 3 ideias estruturadas de vídeo.",
                parameters: {
                  type: "object",
                  properties: {
                    ideas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Título criativo do vídeo" },
                          hook: { type: "string", description: "Gancho inicial impactante (1-2 frases)" },
                          topics: {
                            type: "array",
                            items: { type: "string" },
                            description: "3-4 tópicos principais do vídeo",
                          },
                        },
                        required: ["title", "hook", "topics"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["ideas"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_video_ideas" } },
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
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
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

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Resposta inesperada da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ideas = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(ideas), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("brainstorm-ideas error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const VISION_MODEL = "google/gemini-2.5-pro";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Parse body
    const { photo_paths } = await req.json() as { photo_paths: string[] };
    if (!photo_paths || photo_paths.length < 5) {
      return new Response(JSON.stringify({ error: "Mínimo de 5 fotos necessário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Generate signed URLs for reference photos
    const signedUrls: string[] = [];
    for (const path of photo_paths) {
      const { data } = await supabase.storage.from("studio-reference-photos").createSignedUrl(path, 300);
      if (data?.signedUrl) signedUrls.push(data.signedUrl);
    }

    if (signedUrls.length < 5) {
      return new Response(JSON.stringify({ error: "Erro ao acessar fotos" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Download photos as base64 for the AI model
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192;
      let binaryString = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        for (let j = 0; j < chunk.length; j++) {
          binaryString += String.fromCharCode(chunk[j]);
        }
      }
      return btoa(binaryString);
    }

    const photoDataUrls: string[] = [];
    for (const url of signedUrls) {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = resp.headers.get("content-type") || "image/jpeg";
      photoDataUrls.push(`data:${mimeType};base64,${base64}`);
    }

    // 5. PASS 1 — Forensic individual analysis via Lovable AI Gateway
    const pass1SystemPrompt = `Você é um especialista em análise fotográfica forense e casting cinematográfico.
Sua função é analisar fotos de uma pessoa com precisão clínica para que um modelo de geração
de imagem possa recriar esta pessoa de forma indistinguível.
Cada detalhe documentado será usado diretamente como instrução para a IA geradora.
Seja extremamente específico — vago demais resulta em uma pessoa diferente.
Responda SEMPRE em JSON válido, sem markdown.`;

    const pass1UserContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      ...photoDataUrls.map(url => ({ type: "image_url" as const, image_url: { url } })),
      {
        type: "text",
        text: `Analise estas ${photoDataUrls.length} fotos da mesma pessoa.
Para cada foto de boa qualidade (ignore fotos desfocadas, com óculos de sol ou escuras demais),
documente com precisão máxima. Retorne um JSON com esta estrutura exata:

{
  "photos_analyzed": number,
  "discarded_photos": number,
  "individual_analyses": [
    {
      "photo_index": number,
      "quality": "ótima|boa|regular|ruim",
      "usable": boolean,
      "face": {
        "shape": "oval|redondo|quadrado|coração|losango|retangular|triangular",
        "shape_details": "descrição das proporções (testa, maçãs do rosto, queixo)",
        "skin_fitzpatrick": "I|II|III|IV|V|VI",
        "skin_undertone": "frio|quente|neutro",
        "skin_texture": "lisa|com poros visíveis|com imperfeições naturais",
        "skin_marks": ["descrição de cada sinal/sardas/cicatrizes com localização exata"],
        "eyes_color": "cor exata com variações internas",
        "eyes_shape": "amendoado|redondo|caído|puxado|com epicanto",
        "eyes_size": "grande|médio|pequeno",
        "eyes_spacing": "próximos|normais|afastados",
        "brows_shape": "arqueado|reto|descendente",
        "brows_thickness": "fino|médio|espesso",
        "brows_color": "cor",
        "nose_profile": "reto|aquilino|arrebitado|largo|estreito",
        "nose_bridge": "liso|com saliência|com curvatura",
        "nose_tip": "redondo|afinado|bulboso",
        "nostril_width": "estreitas|médias|largas",
        "lips_size": "pequena|proporcional|grande",
        "upper_lip": "fino|médio|cheio",
        "lower_lip": "fino|médio|cheio",
        "cupids_bow": "definido|suave|ausente",
        "lip_color_natural": "cor natural dos lábios",
        "jaw": "suave|definida|quadrada|angular",
        "chin": "projetado|recuado|fendido|arredondado|pontudo",
        "unique_features": ["sinais, covinhas, cicatrizes com localização precisa"]
      },
      "hair": {
        "color_base": "cor base",
        "highlights": "reflexos na luz ou 'sem reflexos'",
        "length": "raspado|muito curto|curto|médio|longo|muito longo",
        "texture": "liso|ondulado|cacheado|crespo",
        "texture_grade": "1a-1c|2a-2c|3a-3c|4a-4c",
        "volume": "baixo|médio|alto",
        "hairline": "alta|média|baixa",
        "hairline_shape": "reta|arredondada|viúva",
        "grays_visible": boolean,
        "chemical_treatment": "nenhum|colorido|com mechas|alisado|outros"
      },
      "expression": {
        "dominant": "neutra|sorrindo|séria|concentrada|descontraída",
        "smile_type": "fechado|aberto com dentes|com covinhas|ausente",
        "body_language": "aberta e confiante|neutra|fechada",
        "presence_adjectives": ["3 adjetivos que capturam a presença nesta foto"]
      },
      "body": {
        "visible": boolean,
        "biotype": "ectomorfo|mesomorfo|endomorfo|não visível",
        "neck": "fino|médio|largo — curto|médio|longo",
        "shoulders": "estreitos|médios|largos|não visível",
        "height_estimate": "baixa|média|alta|não visível"
      },
      "photo_angle": "frontal|3/4 esquerdo|3/4 direito|perfil|acima|abaixo"
    }
  ]
}`
      },
    ];

    const pass1Response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: pass1SystemPrompt },
          { role: "user", content: pass1UserContent },
        ],
        temperature: 0.1,
      }),
    });

    if (!pass1Response.ok) {
      const errText = await pass1Response.text();
      console.error("Pass 1 AI error:", pass1Response.status, errText);
      if (pass1Response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido, tente novamente em breve." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (pass1Response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da plataforma esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Pass 1 failed: ${pass1Response.status}`);
    }

    const pass1Data = await pass1Response.json();
    const pass1Text = pass1Data.choices?.[0]?.message?.content;
    if (!pass1Text) throw new Error("Pass 1 retornou resposta vazia");

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const pass1Json = pass1Text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const pass1Result = JSON.parse(pass1Json);

    // Log AI usage for pass 1
    logAiUsage({
      userId: user.id,
      functionName: "studio-analyze-photos-pass1",
      model: VISION_MODEL,
      promptTokens: pass1Data.usage?.prompt_tokens ?? 0,
      completionTokens: pass1Data.usage?.completion_tokens ?? 0,
      totalTokens: pass1Data.usage?.total_tokens ?? 0,
    });

    // 6. PASS 2 — Synthesis & Master Profile
    const pass2SystemPrompt = `Você é um diretor de fotografia sênior com 20 anos de experiência em retratos.
Você recebe análises individuais de múltiplas fotos da mesma pessoa e gera o perfil definitivo.
Responda SEMPRE em JSON válido, sem markdown code blocks.`;

    const pass2UserPrompt = `A partir destas análises de ${pass1Result.photos_analyzed} fotos da mesma pessoa,
crie o PERFIL MASTER definitivo para uso como condicionamento do modelo de geração de imagens.

Análises individuais:
${JSON.stringify(pass1Result.individual_analyses, null, 2)}

Regras:
1. Use APENAS análises de fotos marcadas como usable: true
2. Para cada característica, escolha o valor mais recorrente e confiável
3. Resolva contradições priorizando fotos de maior qualidade
4. Para cabelo: documente a característica natural, não o estilo situacional
5. Atribua confidence_score (0.0 a 1.0) para cada grupo de características
6. Adicione photography_notes com instruções específicas para o modelo gerador

Retorne JSON com esta estrutura exata:
{
  "person_summary": "descrição em 2-3 frases que identifica unicamente esta pessoa",
  "gender_presentation": "masculino|feminino|andrógino",
  "apparent_age_range": "faixa etária ex: 30-40",
  "face": { "shape": "", "shape_details": "", "confidence": 0.0 },
  "skin": { "fitzpatrick": "", "undertone": "", "texture": "", "marks": [], "confidence": 0.0 },
  "eyes": { "color": "", "shape": "", "size": "", "spacing": "", "brows": "", "confidence": 0.0 },
  "nose": { "profile": "", "bridge": "", "tip": "", "nostril_width": "", "confidence": 0.0 },
  "lips": { "size": "", "upper": "", "lower": "", "cupids_bow": "", "natural_color": "", "confidence": 0.0 },
  "jaw_chin": { "jaw": "", "chin": "", "confidence": 0.0 },
  "unique_features": { "features": [], "confidence": 0.0 },
  "hair": { "color_base": "", "highlights": "", "length": "", "texture": "", "texture_grade": "", "volume": "", "hairline": "", "grays": false, "chemical_treatment": "", "confidence": 0.0 },
  "presence": { "dominant_expression": "", "smile_type": "", "body_language": "", "adjectives": [], "confidence": 0.0 },
  "body": { "biotype": "", "neck": "", "shoulders": "", "height_estimate": "", "confidence": 0.0 },
  "photography_notes": {
    "emphasize": [],
    "best_angles": [],
    "lighting_recommendation": "",
    "avoid": [],
    "generation_tips": []
  },
  "overall_confidence": 0.0,
  "photos_used": 0,
  "reliability_notes": ""
}`;

    const pass2Response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: pass2SystemPrompt },
          { role: "user", content: pass2UserPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!pass2Response.ok) {
      const errText = await pass2Response.text();
      console.error("Pass 2 AI error:", pass2Response.status, errText);
      if (pass2Response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido, tente novamente em breve." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (pass2Response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da plataforma esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Pass 2 failed: ${pass2Response.status}`);
    }

    const pass2Data = await pass2Response.json();
    const pass2Text = pass2Data.choices?.[0]?.message?.content;
    if (!pass2Text) throw new Error("Pass 2 retornou resposta vazia");

    const pass2Json = pass2Text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const masterProfile = JSON.parse(pass2Json);

    // Log AI usage for pass 2
    logAiUsage({
      userId: user.id,
      functionName: "studio-analyze-photos-pass2",
      model: VISION_MODEL,
      promptTokens: pass2Data.usage?.prompt_tokens ?? 0,
      completionTokens: pass2Data.usage?.completion_tokens ?? 0,
      totalTokens: pass2Data.usage?.total_tokens ?? 0,
    });

    // 7. Upsert profile in database
    const { data: savedProfile, error: saveError } = await supabase
      .from("client_photo_profiles")
      .upsert(
        {
          user_id: user.id,
          profile_document: masterProfile,
          reference_photo_paths: photo_paths,
          photos_analyzed: pass1Result.photos_analyzed ?? photo_paths.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        profile_id: savedProfile.id,
        summary: masterProfile.person_summary,
        overall_confidence: masterProfile.overall_confidence,
        photos_used: masterProfile.photos_used,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("studio-analyze-photos error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

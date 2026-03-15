import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

// Chunked base64 conversion to avoid stack overflow on large buffers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

// Credit cost per quantity
const CREDIT_COST: Record<number, number> = { 1: 1, 3: 2, 5: 3 };

// Layer 1 — Technical base (always included)
const BASE_TECHNICAL =
  `Hyperrealistic professional portrait photograph. Canon EOS R5, 85mm f/1.4L lens, ` +
  `ISO 100, 1/125s. Tack-sharp focus on the subject's eyes with natural lens bokeh. ` +
  `Color grading: neutral white balance, natural skin tones, subtle S-curve contrast, no oversaturation. ` +
  `Retouching: professional but subtle — skin texture preserved, no plastic skin, no AI artifacts. ` +
  `Composition: rule of thirds, subject occupying 60-70% of frame height. ` +
  `Style: Getty Images editorial, Magnum Photos quality. No watermarks, no text, photorealistic.`;

const NEGATIVE_PROMPT =
  `blurry, out of focus, low quality, pixelated, oversaturated, plastic skin, airbrushed skin, ` +
  `no pores, uncanny valley, distorted face, extra fingers, missing fingers, deformed hands, ` +
  `bad anatomy, multiple people, text overlay, watermark, cartoon, illustration, 3d render, ` +
  `ugly, disfigured, mutation, harsh shadows, incorrect eye color, wrong hair color, different person`;

// Layer 3 — Scenario variations (5 each)
const SCENARIOS: Record<string, string[]> = {
  studio: [
    `Professional photography studio, classic Rembrandt lighting. Key light: 90cm octabox at 45° camera-left above eye level, triangular highlight on shadowed cheek. Fill: silver reflector 1:3 ratio. Hair light: strip softbox behind. Background: pure white seamless backdrop. Professional business attire. Pose: body at 45°, face toward lens, chin slightly down, confident eye contact. Mood: authoritative, approachable.`,
    `Studio with simulated natural window light. Key: 120cm rectangular softbox camera-left at 90°, feathered for soft falloff. No fill light. Background: light gray seamless. Smart casual attire, earth tones. Pose: relaxed three-quarter turn. Mood: natural, authentic.`,
    `Dramatic chiaroscuro studio. Key: 60cm octabox at 90° camera-left, no fill. Black seamless backdrop. Rim light: strip softbox behind camera-right on shoulder and jaw. Dark professional attire. Pose: direct, strong posture, chin up. Mood: powerful, premium.`,
    `Studio with textured backdrop. Key: 150cm umbrella overhead slightly front, beauty dish style. Fill: white V-flat 1:4 ratio. Gray textured canvas backdrop. Business formal attire. Pose: standing, slight lean toward camera, open posture. Mood: approachable, professional.`,
    `High-key editorial studio. Three-point lighting equal intensity, shadowless bright atmosphere. Pure white seamless overexposed. White or light gray professional attire. Pose: dynamic, energetic. Mood: modern, fresh.`,
  ],
  clinic: [
    `Modern medical clinic, contemporary minimalist interior. Clean white walls, medical equipment softly visible in background bokeh. Lighting: natural light from frosted windows camera-right with warm overhead LED fill (5000K). White fitted medical coat over professional attire. Pose: standing beside modern desk, arms relaxed. Diplomas softly visible background. Mood: competent, trustworthy.`,
    `Private medical office, warm welcoming atmosphere. Wooden desk, medical books on shelves, plant, diplomas on wall. Strong natural window light camera-left, warm desk lamp fill, golden hour quality. Business professional with or without white coat. Pose: seated at desk leaning slightly forward. Mood: warm, authoritative.`,
    `Premium hospital corridor, modern architecture. Wide bright corridor, clean lines, professional medical setting. Overhead fluorescent softened, window light at corridor end. Medical scrubs or white coat. Pose: walking toward camera mid-stride, looking at lens. Mood: confident, expert.`,
    `Upscale aesthetic clinic, wellness center interior. Premium finishes, marble surfaces, organic shapes, neutral tones (beige, white, sage green), subtle plants. Warm soft lighting, spa-like quality. Branded clinic uniform or smart casual with white coat. Welcoming posture, slight smile. Mood: premium, rejuvenating.`,
    `Clean home office for telehealth. Neutral wall, professional ring light glow, bookshelf visible. Key ring light front-center, window light side fill. White coat over casual professional. Seated at desk looking directly at camera. Mood: modern, accessible.`,
  ],
  office: [
    `Contemporary corporate office, floor-to-ceiling windows with urban skyline, glass walls, premium furniture. Natural window light key from camera-right, soft overhead LED ambient fill. Formal business suit or business professional. Standing beside desk or window, confident posture. Mood: successful, ambitious.`,
    `Executive private office, traditional-modern aesthetic. Large wooden desk, laptop visible, diplomas on wall, bookshelf. Strong natural window light camera-left, warm desk lamp fill. Business casual or professional. Seated at desk leaning forward or arm on desk, confident eye contact. Mood: authoritative, focused.`,
    `Premium executive office panoramic city view. Large window occupying entire background, city skyline soft bokeh. Minimal luxurious office design. Window backlight creating rim light on subject edges, fill light camera-front on face. Premium suit or formal dress. Standing with city backdrop, slight body angle. Mood: high-level, commanding.`,
    `High-end coworking or modern startup space. Exposed brick or concrete walls, industrial design, warm Edison bulbs mixed with natural light, plants, whiteboard. Smart casual, no tie, quality pieces. Leaning against desk or standing arms crossed. Mood: innovative, modern leader.`,
    `Executive boardroom meeting room. Long conference table, leather chairs, whiteboard or screen visible. Professional overhead diffused lighting, balanced and clean. Formal business attire. Standing at head of table or beside screen. Mood: leadership, strategic.`,
  ],
  outdoor: [
    `Outdoor urban environment, golden hour lighting. City street, modern architecture background, soft bokeh depth. Warm directional sunlight at 30-40 degree angle one hour before sunset, natural warm fill from ambient sky. Smart casual, relaxed professional. Walking toward camera or standing naturally. Mood: dynamic, authentic.`,
    `Natural outdoor environment, lush green background. Park, garden or nature path, soft foliage in background. Open shade for soft even illumination, no harsh shadows, green ambient fill. Casual professional, earth tones. Standing naturally, relaxed. Mood: grounded, authentic.`,
    `Modern architectural exterior, premium building facade. Glass and steel modern building, clean geometric lines. Bright overcast sky as natural diffuser. Professional formal, sharp tailored look. Against building wall or on steps, confident posture. Mood: architectural, premium.`,
    `Urban rooftop terrace, city panorama background soft bokeh. Clean railing or architectural elements. Blue hour after sunset, twilight sky, warm city lights complementing cool blue ambient. Business casual or smart casual. Leaning on railing or standing with skyline behind. Mood: aspirational, elevated.`,
    `Upscale café or restaurant outdoor terrace. Premium café seating, tasteful decor, warm ambient string lights, organic greenery. Warm diffused ambient with practical light from venue. Casual smart, relaxed but polished. Seated at table or standing by entrance, natural and relaxed. Mood: approachable, lifestyle.`,
  ],
};

// Build person description from profile
function buildPersonDescription(profile: Record<string, unknown>): string {
  const p = profile as Record<string, any>;
  const parts: string[] = [];

  if (p.gender_presentation) parts.push(`${p.gender_presentation} person`);
  if (p.apparent_age_range) parts.push(`approximately ${p.apparent_age_range} years old`);
  if (p.body?.height_estimate && p.body.height_estimate !== "não visível") {
    parts.push(`${p.body.height_estimate} stature`);
  }

  if (p.face?.shape) {
    parts.push(`${p.face.shape} face shape`);
    if (p.face.shape_details) parts.push(p.face.shape_details);
  }
  if (p.jaw_chin?.jaw) parts.push(`${p.jaw_chin.jaw} jawline`);
  if (p.jaw_chin?.chin) parts.push(`${p.jaw_chin.chin} chin`);

  if (p.skin?.fitzpatrick) {
    parts.push(`Fitzpatrick ${p.skin.fitzpatrick} skin tone with ${p.skin.undertone || "neutral"} undertones`);
    if (p.skin.texture) parts.push(`${p.skin.texture} skin texture`);
    if (p.skin.marks?.length > 0) parts.push(`with ${p.skin.marks.join(", ")}`);
  }

  if (p.eyes?.color) {
    parts.push(`${p.eyes.shape || ""} ${p.eyes.color} eyes`.trim());
    if (p.eyes.spacing) parts.push(`${p.eyes.spacing} set`);
    if (p.eyes.brows) parts.push(`${p.eyes.brows}`);
  }

  if (p.nose?.profile) parts.push(`${p.nose.profile} nose with ${p.nose.nostril_width || "medium"} nostrils`);

  if (p.lips?.size) {
    parts.push(`${p.lips.size} lips`);
    if (p.lips.upper) parts.push(`${p.lips.upper} upper lip`);
    if (p.lips.cupids_bow !== "ausente") parts.push(`${p.lips.cupids_bow} cupid's bow`);
    if (p.lips.natural_color) parts.push(`natural ${p.lips.natural_color} lip color`);
  }

  if (p.unique_features?.features?.length > 0) {
    parts.push(`Distinctive features: ${p.unique_features.features.join(", ")}`);
  }

  if (p.hair?.color_base) {
    let hairDesc = `${p.hair.length || "medium"} ${p.hair.texture || ""} ${p.hair.color_base} hair`.trim();
    if (p.hair.highlights && p.hair.highlights !== "sem reflexos") {
      hairDesc += ` with ${p.hair.highlights}`;
    }
    if (p.hair.volume) hairDesc += `, ${p.hair.volume} volume`;
    parts.push(hairDesc);
  }

  if (p.photography_notes?.emphasize?.length > 0) {
    parts.push(`Key identifying features: ${p.photography_notes.emphasize.join(", ")}`);
  }

  return parts.join(". ") + ".";
}

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
    const { scenario, quantity } = await req.json() as {
      scenario: "studio" | "clinic" | "office" | "outdoor";
      quantity: 1 | 3 | 5;
    };

    if (!SCENARIOS[scenario]) {
      return new Response(JSON.stringify({ error: "Cenário inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const creditCost = CREDIT_COST[quantity];
    if (!creditCost) {
      return new Response(JSON.stringify({ error: "Quantidade inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Check and debit credits
    const { data: creditsData } = await supabase
      .from("studio_credits")
      .select("id, credits_available, credits_used")
      .eq("user_id", user.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const available = creditsData?.credits_available ?? 10;
    if (available < creditCost) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Fetch client profile
    const { data: profileData, error: profileError } = await supabase
      .from("client_photo_profiles")
      .select("profile_document, reference_photo_paths")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado. Analise suas fotos primeiro." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profile = profileData.profile_document as Record<string, unknown>;

    // 5. Create photo shoot record
    const { data: shoot, error: shootError } = await supabase
      .from("photo_shoots")
      .insert({
        user_id: user.id,
        scenario,
        quantity,
        credits_used: creditCost,
        status: "processing",
      })
      .select("id")
      .single();

    if (shootError) throw shootError;

    // 6. Download reference photos as data URLs for the AI model
    const refPaths = (profileData.reference_photo_paths as string[] || []).slice(0, 5);
    const refDataUrls: string[] = [];
    for (const path of refPaths) {
      const { data } = await supabase.storage.from("studio-reference-photos").createSignedUrl(path, 600);
      if (!data?.signedUrl) continue;
      const resp = await fetch(data.signedUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = resp.headers.get("content-type") || "image/jpeg";
      refDataUrls.push(`data:${mimeType};base64,${base64}`);
    }

    // 7. Build person description
    const personDescription = buildPersonDescription(profile);
    const scenarioVariations = SCENARIOS[scenario];

    // 8. Generate photos one by one
    const generatedPhotoPaths: string[] = [];
    const usedVariations = new Set<number>();

    for (let i = 0; i < quantity; i++) {
      // Pick unused variation
      let variationIdx: number;
      do {
        variationIdx = Math.floor(Math.random() * scenarioVariations.length);
      } while (usedVariations.has(variationIdx) && usedVariations.size < scenarioVariations.length);
      usedVariations.add(variationIdx);

      const scenarioPrompt = scenarioVariations[variationIdx];
      const fullPrompt =
        `Generate a photorealistic portrait of the person shown in the reference photos above.\n\n` +
        `${BASE_TECHNICAL}\n\nSUBJECT: ${personDescription}\n\nSETTING AND LIGHTING: ${scenarioPrompt}\n\n` +
        `Negative prompt (avoid): ${NEGATIVE_PROMPT}`;

      // Build message content with reference images + text prompt
      const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        ...refDataUrls.map(url => ({ type: "image_url" as const, image_url: { url } })),
        { type: "text", text: fullPrompt },
      ];

      try {
        const imagenResponse = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: IMAGE_MODEL,
            messages: [
              { role: "user", content: messageContent },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!imagenResponse.ok) {
          console.error(`Image generation failed for photo ${i + 1}:`, imagenResponse.status, await imagenResponse.text());
          continue;
        }

        const imagenData = await imagenResponse.json();

        // Log AI usage
        logAiUsage({
          userId: user.id,
          functionName: "studio-generate-photos",
          model: IMAGE_MODEL,
          promptTokens: imagenData.usage?.prompt_tokens ?? 0,
          completionTokens: imagenData.usage?.completion_tokens ?? 0,
          totalTokens: imagenData.usage?.total_tokens ?? 0,
        });

        // Extract base64 image from response
        const imageDataUrl = imagenData.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;

        if (!imageDataUrl) {
          console.error(`No image data for photo ${i + 1}`);
          continue;
        }

        // Parse the data URL to get raw bytes
        const base64Match = imageDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (!base64Match) {
          console.error(`Invalid image data URL for photo ${i + 1}`);
          continue;
        }

        const imageBytes = Uint8Array.from(atob(base64Match[1]), c => c.charCodeAt(0));
        const filePath = `${user.id}/shoots/${shoot.id}/${i + 1}.png`;

        const { error: uploadError } = await supabase.storage
          .from("studio-generated-photos")
          .upload(filePath, imageBytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError) {
          generatedPhotoPaths.push(filePath);
        } else {
          console.error(`Upload error for photo ${i + 1}:`, uploadError);
        }
      } catch (genErr) {
        console.error(`Generation error for photo ${i + 1}:`, genErr);
        continue;
      }
    }

    // 9. Update shoot record
    const finalStatus = generatedPhotoPaths.length > 0 ? "completed" : "failed";
    await supabase
      .from("photo_shoots")
      .update({
        status: finalStatus,
        generated_photo_paths: generatedPhotoPaths,
        error_message: generatedPhotoPaths.length === 0 ? "Nenhuma foto gerada com sucesso" : null,
      })
      .eq("id", shoot.id);

    // 10. Debit credits only if at least one photo was generated
    if (generatedPhotoPaths.length > 0 && creditsData?.id) {
      await supabase
        .from("studio_credits")
        .update({
          credits_available: available - creditCost,
          credits_used: (creditsData.credits_used ?? 0) + creditCost,
        })
        .eq("id", creditsData.id);
    }

    if (generatedPhotoPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma foto foi gerada com sucesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Generate signed URLs (7 days) for the generated photos
    const signedPhotoUrls: string[] = [];
    for (const path of generatedPhotoPaths) {
      const { data } = await supabase.storage
        .from("studio-generated-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) signedPhotoUrls.push(data.signedUrl);
    }

    return new Response(
      JSON.stringify({
        shoot_id: shoot.id,
        photos: signedPhotoUrls,
        credits_used: creditCost,
        credits_remaining: available - creditCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("studio-generate-photos error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logAiUsage } from '../_shared/log-ai-usage.ts'

const PHOTO_VARIATIONS = [
  {
    angle: 'slight 3/4 angle toward camera, subject looking directly at lens with steady gaze',
    expression: 'neutral confident expression, composed and authoritative, jaw slightly set',
    lighting: 'classic Rembrandt 45° key light from upper left, soft fill on right, warm golden tones',
    framing: 'upper body portrait, head and chest prominent, negative space on one side',
    pose: 'standing upright, shoulders squared, one hand resting at side, relaxed power stance',
  },
  {
    angle: 'tight headshot, face nearly frontal, eyes looking directly into lens',
    expression: 'genuine warm smile, natural and approachable energy',
    lighting: 'soft butterfly lighting from directly above and in front, clean even shadows',
    framing: 'extreme close crop: face fills 80% of frame, shallow depth of field',
    pose: 'relaxed neck, chin slightly forward and down, natural shoulder drop',
  },
  {
    angle: 'strong 45° profile body angle, face turns back toward camera',
    expression: 'intense contemplative look, eyes slightly narrowed, editorial',
    lighting: 'dramatic hard side light creating deep shadow across half the face, thin silver rim light from behind',
    framing: 'mid-body showing torso and arms, subject taking up left third of frame',
    pose: 'one hand in jacket pocket, other arm relaxed, weight shifted — editorial stance',
  },
  {
    angle: 'subtle low angle (camera at chest level looking up) — empowering',
    expression: 'open genuine laugh, eyes squinting slightly, caught in a real moment of joy',
    lighting: 'bright high-key ambient with crisp directional window key from above',
    framing: 'full upper body visible including hands, open body language',
    pose: 'walking mid-stride toward camera, jacket open, relaxed energy — dynamic movement',
  },
  {
    angle: 'eye-level, perfectly symmetrical frontal',
    expression: 'calm decisive look: steady unwavering direct gaze, mouth closed, quiet power',
    lighting: 'cinematic split lighting: warm amber key from left, cool blue-silver fill from right',
    framing: 'classic bust crop just below collarbones, background falls to deep bokeh blur',
    pose: 'hands clasped in front, slight forward lean, intentional stillness',
  },
];

const SCENARIO_PROMPTS: Record<string, string> = {
  // ── CORPORATIVO ──
  executive_office: `Professional executive portrait of this exact person in a modern high-rise corner office, floor-to-ceiling windows with panoramic city skyline behind, dark walnut desk visible. Wearing an impeccably tailored dark navy suit, white dress shirt, silk tie. {{VARIATION}} Shot on Canon EOS R5, 85mm f/1.4, shallow depth of field. Cinematic editorial quality, photorealistic, ultra-sharp face.`,
  boardroom: `Corporate portrait of this exact person in a Fortune 500 executive boardroom, mahogany conference table receding in background, large display showing business analytics. Wearing a charcoal bespoke suit with subtle pinstripe, silver pocket square. {{VARIATION}} Shot on Canon EOS R5, 70mm f/2.0. Annual-report quality, photorealistic.`,
  startup_workspace: `Portrait of this exact person in a vibrant modern startup loft: exposed brick walls, Edison pendant bulb clusters, whiteboards with colorful sticky notes, trailing green plants. Wearing smart casual — slim charcoal blazer over a crisp black t-shirt. {{VARIATION}} Shot on Sony A7R IV, 85mm f/1.8. Tech magazine editorial quality, photorealistic.`,
  consulting_office: `Professional portrait of this exact person in a premium private consulting office: floor-to-ceiling walnut bookshelves, warm brass desk lamp creating amber glow, minimal desk. Wearing a navy blazer, white Oxford shirt — polished but approachable. {{VARIATION}} Shot on Nikon Z9, 85mm f/1.4. McKinsey-level professional imagery, photorealistic.`,
  outdoor_business: `Environmental business portrait of this exact person on a rooftop terrace of a glass tower, city skyline behind, overcast sky providing perfect diffused light. Wearing a charcoal wool overcoat over dark turtleneck. {{VARIATION}} Shot on Leica SL2, 90mm f/2.0. Premium brand campaign quality, photorealistic.`,
  outdoor_rooftop: `Environmental business portrait of this exact person on a rooftop terrace at dusk, city skyline glittering behind, steel and glass architectural forms. Wearing a charcoal wool overcoat over dark turtleneck. {{VARIATION}} Shot on Leica SL2, 90mm f/2.0. Premium brand campaign quality, photorealistic.`,
  // ── EDITORIAL ──
  studio_editorial: `High-fashion editorial portrait of this exact person in a minimal studio against seamless pure-white backdrop. Wearing architectural fashion: structured black blazer. Three-light studio setup: hard key from upper left, soft fill from right, white background light. {{VARIATION}} Shot on Phase One XF, 80mm f/2.8. Vogue editorial quality, photorealistic.`,
  fashion_dark_editorial: `Edgy dark fashion editorial portrait of this exact person in a raw concrete industrial loft: peeling paint walls, dramatic shadows. Wearing avant-garde fashion: oversized black leather trench coat. Strong side key light from a single window, deep shadow on opposite side, thin silver rim light. {{VARIATION}} Shot on Hasselblad X2D, 90mm f/2.2. i-D editorial quality, photorealistic.`,
  luxury_hotel_lobby: `Luxury brand campaign portrait of this exact person in a grand five-star hotel lobby: soaring marble columns, gold-leafed ceiling, enormous fresh floral arrangements. Wearing elegant cream linen blazer, tapered trousers. Soft ambient lobby lighting with warm chandelier glow. {{VARIATION}} Shot on Mamiya RB67, 90mm f/2.8. LVMH campaign quality, photorealistic.`,
  fashion_street: `Fashion campaign street portrait of this exact person on a quiet Parisian-style cobblestone street: Haussmann-era facades with wrought-iron balconies blurred behind, morning golden sidelight. Wearing contemporary tailored trench coat, white tee, slim trousers. {{VARIATION}} Shot on Leica M11, 50mm f/1.4. Acne Studios campaign quality, photorealistic.`,
  // ── LIFESTYLE ──
  golden_hour_outdoor: `Warm lifestyle portrait of this exact person outdoors at golden hour, late afternoon sun creating glowing backlight in hair, soft warm reflected fill on face. Background: lush bokeh green trees and golden meadow. Wearing casual premium cream linen shirt, beige trousers. {{VARIATION}} Shot on Sony A7R V, 50mm f/1.4. Fine-art portrait quality, photorealistic.`,
  cafe_lifestyle: `Warm lifestyle portrait of this exact person in a cozy specialty coffee shop: exposed wood beams, hanging plants, warm amber pendant lights, large street-facing windows with diffused morning light. Wearing casual smart denim jacket over white Breton stripe shirt. {{VARIATION}} Shot on Fujifilm GFX 50R, 63mm f/2.8. Kinfolk magazine aesthetic, photorealistic.`,
  beach_sunset: `Cinematic lifestyle portrait of this exact person on a near-empty beach at golden sunset: turquoise ocean blurred behind, wet sand reflecting warm pink-orange sky. Wearing linen resort wear — open white shirt, rolled trousers, barefoot. Rim lighting from low sun, warm reflective fill from sand. {{VARIATION}} Shot on Canon EOS R5, 85mm f/1.8. Luxury travel campaign, photorealistic.`,
  forest_nature: `Atmospheric nature portrait of this exact person in a lush green forest: shafts of dappled sunlight through dense canopy, moss-covered ground, ferns in foreground bokeh. Wearing outdoorsy navy wool sweater, earth-tone field jacket. Natural soft directional light through canopy. {{VARIATION}} Shot on Nikon Z8, 85mm f/1.4. National Geographic portrait quality, photorealistic.`,
  // ── ARTÍSTICO ──
  neon_cyberpunk: `Cinematic cyberpunk neon portrait of this exact person in a rain-slicked urban alley at midnight: vivid pink and electric blue neon signs reflecting off wet pavement, steam rising. Wearing a dark leather jacket. Hard neon rim lighting in magenta from left, cyan fill from right, deep shadows. {{VARIATION}} Shot on Sony A7 III, 50mm f/1.8. Blade Runner 2049 cinematography, photorealistic.`,
  vintage_film: `Intimate vintage-film-aesthetic portrait of this exact person in a sun-drenched interior with sheer curtain diffusing light: worn parquet floor, antique mirror, muted color palette. Wearing soft vintage oversized linen button-up shirt. Soft diffused window light, warm color cast, visible film grain. {{VARIATION}} Shot on Contax 645, Kodak Portra 400, 80mm f/2.0. Photorealistic.`,
  moody_warehouse: `Dramatic industrial portrait of this exact person in a raw warehouse: steel beams and skylights, light fog creating volumetric light beams from high windows. Wearing dark structured overcoat. Single narrow spotlight beam illuminates face and shoulders from above, deep shadows. {{VARIATION}} Shot on Fujifilm GFX 100S, 110mm f/2.0. Craig McDean editorial quality, photorealistic.`,
  studio_bw: `Timeless black-and-white studio portrait of this exact person: pure white background, classic chiaroscuro contrast. Wearing simple dark crew-neck sweater. Classic Rembrandt lighting: single key from 45° above-left, small catchlight reflector. Converted to black and white with rich tonal range. {{VARIATION}} Shot on Hasselblad 500C/M, 80mm f/2.8. Irving Penn quality, photorealistic.`,
  // ── CREATOR / SOCIAL ──
  home_office_creator: `Authentic creator lifestyle portrait of this exact person in a beautifully curated home studio: floor-to-ceiling bookshelves, trailing Monstera plants, large monitor in background, warm wood tones. Wearing casual untucked Oxford shirt, sleeves rolled. Natural daylight from large side window. {{VARIATION}} Shot on Sony FX3, 50mm f/1.8. YouTube creator aesthetic, photorealistic.`,
  wellness_spa: `Serene wellness lifestyle portrait of this exact person in a minimalist Japanese spa interior: smooth natural stone, single orchid, shallow water pool reflecting diffused light, neutral sand and cream palette. Wearing soft spa-white robe. Soft overhead diffused natural light, completely even. {{VARIATION}} Shot on Leica SL2, 75mm f/2.0. Aman Resorts campaign quality, photorealistic.`,
  urban_lifestyle: `Candid urban lifestyle portrait of this exact person on a quiet downtown street on a crisp clear morning: modernist glass architecture reflecting blue sky, autumn leaves on pavement. Wearing contemporary grey crewneck, dark trousers, white sneakers. Available natural morning light, slightly cool and clean. {{VARIATION}} Shot on Ricoh GR IIIx, 40mm f/2.8. COS campaign quality, photorealistic.`,
  // ── LEGACY (kept for backward compatibility) ──
  studio: `Professional studio portrait of this exact person against a clean backdrop with three-point lighting. Wearing smart business attire. {{VARIATION}} Shot on Canon EOS R5, 85mm f/1.4. Photorealistic.`,
  clinic: `Professional portrait of this exact person in a modern medical office, clean white interior with subtle warm accents. Wearing a professional white coat. {{VARIATION}} Shot on Nikon Z9, 85mm f/1.4. Photorealistic.`,
  office: `Executive portrait of this exact person in a modern corporate office with clean lines and warm wood accents. Wearing business attire. {{VARIATION}} Shot on Canon EOS R5, 85mm f/1.4. Photorealistic.`,
  outdoor: `Environmental portrait of this exact person in a beautiful outdoor setting with natural light. Wearing smart casual attire. {{VARIATION}} Shot on Sony A7R V, 85mm f/1.8. Photorealistic.`,
};

const CREDIT_COSTS: Record<number, number> = { 1: 1, 3: 2, 5: 3 }
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { scenario, quantity, profile_id } = await req.json()
    const creditCost = CREDIT_COSTS[quantity] ?? 3

    // 1. Check credits
    const { data: credits } = await supabase
      .from('studio_credits')
      .select('credits_available, credits_used')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!credits || credits.credits_available < creditCost) {
      throw new Error(`Créditos insuficientes. Necessário: ${creditCost}, disponível: ${credits?.credits_available ?? 0}`)
    }

    // 2. Fetch profile
    const { data: profile } = await supabase
      .from('client_photo_profiles')
      .select('reference_image_url, lora_url, training_status, profile_document, reference_photo_paths')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.training_status !== 'completed') {
      throw new Error('Perfil de fotos não está pronto. Complete o treinamento primeiro.')
    }

    // 3. Create photo_shoot record with 'processing' status
    const { data: shoot, error: shootErr } = await supabase
      .from('photo_shoots')
      .insert({
        user_id: user.id,
        scenario,
        quantity,
        reference_image_url: profile.reference_image_url,
        lora_url: profile.lora_url,
        credits_used: creditCost,
        status: 'processing',
      })
      .select('id')
      .single()

    if (shootErr) throw shootErr

    // 4. Deduct credits immediately
    await supabase
      .from('studio_credits')
      .update({
        credits_available: credits.credits_available - creditCost,
        credits_used: credits.credits_used + creditCost,
      })
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)

    // 5. Process in background using EdgeRuntime.waitUntil
    const backgroundTask = (async () => {
      try {
        // Use the LoRA-generated reference image (higher quality, trained model)
        let referenceImageUrl: string | null = profile.reference_image_url

        // Fallback to a real uploaded photo if LoRA reference is not available
        if (!referenceImageUrl) {
          const realPhotoPaths = (profile as any).reference_photo_paths as string[] | null
          if (realPhotoPaths && realPhotoPaths.length > 0) {
            const { data: signedReal } = await supabase.storage
              .from('studio-reference-photos')
              .createSignedUrl(realPhotoPaths[0], 60 * 60)
            if (signedReal?.signedUrl) {
              referenceImageUrl = signedReal.signedUrl
            }
          }
        }

        if (!referenceImageUrl) {
          throw new Error('Nenhuma foto de referência disponível.')
        }

        // Download reference and convert to base64
        const refImageResponse = await fetch(referenceImageUrl)
        const refImageBuffer = await refImageResponse.arrayBuffer()
        const bytes = new Uint8Array(refImageBuffer)
        const chunkSize = 8192
        let binary = ''
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j])
          }
        }
        const refImageBase64 = btoa(binary)
        const mimeType = refImageResponse.headers.get('content-type') || 'image/jpeg'

        const doc = profile.profile_document as Record<string, any> | null
        const personDescription = doc?.person_summary
          ? `This person: ${doc.person_summary}. Generate a photo of THIS EXACT person.`
          : 'Generate a professional portrait of this exact person shown in the reference image.'

        const scenarioPrompt = SCENARIO_PROMPTS[scenario] ?? SCENARIO_PROMPTS.executive_office
        // Inject unique variation per photo
        const variation = PHOTO_VARIATIONS[i % PHOTO_VARIATIONS.length]
        const variationText = `${variation.angle}. ${variation.expression}. ${variation.lighting}. ${variation.framing}. ${variation.pose}.`
        const finalPrompt = scenarioPrompt.replace('{{VARIATION}}', variationText)
        const generatedPaths: string[] = []

        for (let i = 0; i < quantity; i++) {
          const aiResponse = await fetch(AI_GATEWAY, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: IMAGE_MODEL,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${refImageBase64}` } },
                  { type: 'text', text: `${personDescription}\n\n${finalPrompt}\n\nGenerate a single photorealistic image. The person in the generated image MUST look identical to the person in the reference photo — same facial features, skin tone, hair, and overall appearance. Only change the clothing, pose, and background as described in the scenario.` },
                ],
              }],
              modalities: ['image', 'text'],
            }),
          })

          if (!aiResponse.ok) {
            console.error('AI gateway error:', aiResponse.status, await aiResponse.text())
            continue // skip this image, try next
          }

          const aiData = await aiResponse.json()

          logAiUsage({
            userId: user.id,
            functionName: 'studio-generate-photos',
            model: IMAGE_MODEL,
            promptTokens: aiData.usage?.prompt_tokens ?? 0,
            completionTokens: aiData.usage?.completion_tokens ?? 0,
            totalTokens: aiData.usage?.total_tokens ?? 0,
          })

          // Extract image from response
          const message = aiData.choices?.[0]?.message
          let imageBase64: string | null = null
          let imageMime = 'image/png'

          // Check message.images[]
          if (message?.images && Array.isArray(message.images)) {
            for (const img of message.images) {
              const url = img?.image_url?.url || img?.url
              if (url) {
                const match = url.match(/data:(image\/[^;]+);base64,(.+)/)
                if (match) { imageMime = match[1]; imageBase64 = match[2]; break }
              }
            }
          }
          // Fallback: content array
          if (!imageBase64 && Array.isArray(message?.content)) {
            for (const part of message.content) {
              if (part.type === 'image_url' && part.image_url?.url) {
                const match = part.image_url.url.match(/data:(image\/[^;]+);base64,(.+)/)
                if (match) { imageMime = match[1]; imageBase64 = match[2]; break }
              }
              if (part.inline_data) { imageMime = part.inline_data.mime_type || 'image/png'; imageBase64 = part.inline_data.data; break }
            }
          }
          // Fallback: content string
          if (!imageBase64 && typeof message?.content === 'string') {
            const m = message.content.match(/data:(image\/[^;]+);base64,([A-Za-z0-9+/=]+)/)
            if (m) { imageMime = m[1]; imageBase64 = m[2] }
          }

          if (!imageBase64) {
            console.error('No image in AI response for iteration', i)
            continue
          }

          const ext = imageMime.includes('png') ? 'png' : 'jpg'
          const buffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))
          const filePath = `${user.id}/${profile_id}/${scenario}_${Date.now()}_${i}.${ext}`

          const { error: uploadErr } = await supabase.storage
            .from('studio-generated-photos')
            .upload(filePath, buffer, { contentType: imageMime, upsert: false })

          if (uploadErr) {
            console.error('Upload error:', uploadErr)
            continue
          }

          generatedPaths.push(filePath)
        }

        if (generatedPaths.length === 0) {
          throw new Error('Nenhuma imagem foi gerada com sucesso.')
        }

        // Update photo_shoot with results
        await supabase
          .from('photo_shoots')
          .update({
            generated_photo_paths: generatedPaths,
            status: 'completed',
          })
          .eq('id', shoot.id)

      } catch (error) {
        console.error('Background generation error:', error)
        await supabase
          .from('photo_shoots')
          .update({
            status: 'failed',
            error_message: (error as Error).message,
          })
          .eq('id', shoot.id)
      }
    })()

    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(backgroundTask)

    // Return immediately with shoot ID for polling
    return new Response(
      JSON.stringify({ success: true, shoot_id: shoot.id, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('studio-generate-photos error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

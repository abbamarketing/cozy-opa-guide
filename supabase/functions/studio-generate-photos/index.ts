import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logAiUsage } from '../_shared/log-ai-usage.ts'

// Prompts de cenário para geração de retratos
const SCENARIO_PROMPTS: Record<string, string> = {
  executive_office: `Professional executive portrait of this exact person in a modern high-rise office, floor-to-ceiling windows with city skyline at golden hour, wearing a well-tailored dark navy suit with white dress shirt and silk tie. Standing confidently with hands clasped, slight 3/4 angle toward camera. Shot on Canon EOS R5, 85mm f/1.4, shallow depth of field, warm directional window light creating soft shadows. Cinematic editorial quality, photorealistic.`,
  startup_workspace: `Professional portrait of this exact person in a contemporary startup office, exposed brick walls, Edison bulb pendant lights, whiteboard with sticky notes blurred in background, lush green plants. Wearing smart casual: charcoal blazer over black t-shirt. Leaning slightly against a wooden standing desk, relaxed confident posture, genuine expression. Shot on Sony A7R IV, 85mm f/1.8, natural window light from left, warm ambient fill. Editorial tech magazine quality.`,
  boardroom: `Corporate portrait of this exact person standing at the head of a mahogany boardroom table, leather executive chairs receding in background, screen displaying business analytics. Wearing impeccably fitted navy blue suit, white shirt, silver tie. Poised, authoritative stance, direct eye contact with camera. Shot on Canon EOS R5, 70mm f/2.0, balanced fluorescent + window light, clean corporate aesthetic. Fortune 500 annual report quality.`,
  consulting_office: `Professional consulting portrait of this exact person in a premium private office, warm wood bookshelf filled with books visible behind, elegant desk lamp creating warm accent light. Wearing business casual: navy chinos, white oxford shirt, cognac leather belt. Seated at a clean minimal desk, one hand resting naturally, engaged and approachable expression. Shot on Nikon Z9, 85mm f/1.4, warm key light + cool window fill. McKinsey-level professional imagery.`,
  outdoor_business: `Environmental business portrait of this exact person on a rooftop terrace of a modern office building, glass facades of city buildings behind, overcast sky creating perfect diffused light. Wearing charcoal wool coat over dark turtleneck. Standing near a glass railing, looking slightly off-camera with a thoughtful expression. Shot on Leica SL2, 90mm Summicron, natural overcast diffused light, subtle architectural bokeh. Premium brand campaign quality.`,
}

const CREDIT_COSTS: Record<number, number> = { 1: 1, 3: 2, 5: 3 }
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const IMAGE_MODEL = 'google/gemini-3-pro-image-preview'

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

    // 1. Verifica créditos
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

    // 2. Busca perfil com profile_document e reference_image_url
    const { data: profile } = await supabase
      .from('client_photo_profiles')
      .select('reference_image_url, lora_url, training_status, profile_document')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.training_status !== 'completed') {
      throw new Error('Perfil de fotos não está pronto. Complete o treinamento primeiro.')
    }

    // If reference image is missing but LoRA exists, generate it on-demand
    if (!profile.reference_image_url && profile.lora_url) {
      const FAL_KEY = Deno.env.get('FAL_AI_KEY')
      if (!FAL_KEY) throw new Error('FAL_AI_KEY not configured')

      const triggerWord = 'SUBJECTPERSON'
      const refResponse = await fetch('https://fal.run/fal-ai/flux-lora', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `professional portrait photo of ${triggerWord}, neutral expression, looking directly at camera, plain white background, studio lighting, sharp focus, high resolution headshot`,
          negative_prompt: 'blurry, distorted, cartoon, painting, illustration, bad anatomy, multiple people',
          loras: [{ path: profile.lora_url, scale: 1.0 }],
          num_images: 1,
          image_size: 'portrait_4_3',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          enable_safety_checker: true,
        }),
      })

      if (!refResponse.ok) {
        throw new Error('Falha ao gerar imagem de referência automaticamente.')
      }

      const refResult = await refResponse.json()
      const refUrl = refResult?.images?.[0]?.url

      if (!refUrl) {
        throw new Error('Imagem de referência não pôde ser gerada.')
      }

      // Download and persist to storage
      const imgResp = await fetch(refUrl)
      const imgBuf = await imgResp.arrayBuffer()
      const storagePath = `${user.id}/${profile_id}/canonical_reference.jpg`

      await supabase.storage
        .from('studio-lora-references')
        .upload(storagePath, imgBuf, { contentType: 'image/jpeg', upsert: true })

      const { data: signedRef } = await supabase.storage
        .from('studio-lora-references')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      const finalRefUrl = signedRef?.signedUrl ?? refUrl

      await supabase
        .from('client_photo_profiles')
        .update({ reference_image_url: finalRefUrl })
        .eq('id', profile_id)

      profile.reference_image_url = finalRefUrl
    }

    if (!profile.reference_image_url) {
      throw new Error('Imagem de referência não encontrada e não há LoRA para gerar uma.')
    }

    // 3. Baixa a imagem de referência e converte para base64
    const refImageResponse = await fetch(profile.reference_image_url)
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

    // 4. Build person description from profile_document
    const doc = profile.profile_document as Record<string, any> | null
    const personDescription = doc?.person_summary
      ? `This person: ${doc.person_summary}. Generate a photo of THIS EXACT person.`
      : 'Generate a professional portrait of this exact person shown in the reference image.'

    const scenarioPrompt = SCENARIO_PROMPTS[scenario] ?? SCENARIO_PROMPTS.executive_office

    const generatedUrls: string[] = []
    const generatedPaths: string[] = []

    for (let i = 0; i < quantity; i++) {
      // 5. Chama Lovable AI Gateway com modelo de geração de imagem
      const aiResponse = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${refImageBase64}` },
                },
                {
                  type: 'text',
                  text: `${personDescription}\n\n${scenarioPrompt}\n\nGenerate a single photorealistic image. The person in the generated image MUST look identical to the person in the reference photo — same facial features, skin tone, hair, and overall appearance. Only change the clothing, pose, and background as described in the scenario.`,
                },
              ],
            },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('AI gateway error:', aiResponse.status, errText)
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições excedido, tente novamente em breve.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos da plataforma esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        throw new Error(`Image generation failed: ${aiResponse.status}`)
      }

      const aiData = await aiResponse.json()

      // Log AI usage
      logAiUsage({
        userId: user.id,
        functionName: 'studio-generate-photos',
        model: IMAGE_MODEL,
        promptTokens: aiData.usage?.prompt_tokens ?? 0,
        completionTokens: aiData.usage?.completion_tokens ?? 0,
        totalTokens: aiData.usage?.total_tokens ?? 0,
      })

      // Extract generated image from response
      // Gemini image models return inline_data in parts
      const parts = aiData.choices?.[0]?.message?.content
      let imageBase64: string | null = null
      let imageMime = 'image/png'

      if (typeof parts === 'string') {
        // Try to extract base64 image from markdown or data URI
        const dataUriMatch = parts.match(/data:(image\/[^;]+);base64,([A-Za-z0-9+/=]+)/)
        if (dataUriMatch) {
          imageMime = dataUriMatch[1]
          imageBase64 = dataUriMatch[2]
        }
      } else if (Array.isArray(parts)) {
        // Multi-part response with inline images
        for (const part of parts) {
          if (part.type === 'image_url' && part.image_url?.url) {
            const match = part.image_url.url.match(/data:(image\/[^;]+);base64,(.+)/)
            if (match) {
              imageMime = match[1]
              imageBase64 = match[2]
              break
            }
          }
          if (part.inline_data) {
            imageMime = part.inline_data.mime_type || 'image/png'
            imageBase64 = part.inline_data.data
            break
          }
        }
      }

      if (!imageBase64) {
        console.error('No image in AI response:', JSON.stringify(aiData).substring(0, 500))
        throw new Error('O modelo não retornou uma imagem. Tente novamente.')
      }

      // 6. Salva foto gerada no Storage
      const ext = imageMime.includes('png') ? 'png' : 'jpg'
      const buffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))
      const filePath = `${user.id}/${profile_id}/${scenario}_${Date.now()}_${i}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('studio-generated-photos')
        .upload(filePath, buffer, {
          contentType: imageMime,
          upsert: false,
        })

      if (uploadErr) throw uploadErr

      const { data: signedData } = await supabase.storage
        .from('studio-generated-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)

      generatedPaths.push(filePath)
      if (signedData?.signedUrl) generatedUrls.push(signedData.signedUrl)
    }

    // 7. Registra a sessão
    await supabase
      .from('photo_shoots')
      .insert({
        user_id: user.id,
        scenario,
        quantity,
        generated_photo_paths: generatedPaths,
        reference_image_url: profile.reference_image_url,
        lora_url: profile.lora_url,
        credits_used: creditCost,
      })

    // 8. Desconta créditos
    await supabase
      .from('studio_credits')
      .update({
        credits_available: credits.credits_available - creditCost,
        credits_used: credits.credits_used + creditCost,
      })
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)

    return new Response(
      JSON.stringify({ success: true, photos: generatedUrls }),
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
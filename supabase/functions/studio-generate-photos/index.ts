import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Prompts de cenário para Imagen 3
const SCENARIO_PROMPTS: Record<string, string> = {
  executive_office: `Professional executive portrait of SUBJECTPERSON in a modern high-rise office, floor-to-ceiling windows with city skyline at golden hour, wearing a well-tailored dark navy suit with white dress shirt and silk tie. Subject stands confidently with hands clasped, slight 3/4 angle toward camera. Shot on Canon EOS R5, 85mm f/1.4, shallow depth of field, warm directional window light creating soft shadows. Cinematic editorial quality, photorealistic.`,

  startup_workspace: `Professional portrait of SUBJECTPERSON in a contemporary startup office, exposed brick walls, Edison bulb pendant lights, whiteboard with sticky notes blurred in background, lush green plants. Wearing smart casual: charcoal blazer over black t-shirt. Leaning slightly against a wooden standing desk, relaxed confident posture, genuine expression. Shot on Sony A7R IV, 85mm f/1.8, natural window light from left, warm ambient fill. Editorial tech magazine quality.`,

  boardroom: `Corporate portrait of SUBJECTPERSON standing at the head of a mahogany boardroom table, leather executive chairs receding in background, screen displaying business analytics. Wearing impeccably fitted navy blue suit, white shirt, silver tie. Poised, authoritative stance, direct eye contact with camera. Shot on Canon EOS R5, 70mm f/2.0, balanced fluorescent + window light, clean corporate aesthetic. Fortune 500 annual report quality.`,

  consulting_office: `Professional consulting portrait of SUBJECTPERSON in a premium private office, warm wood bookshelf filled with books visible behind, elegant desk lamp creating warm accent light. Wearing business casual: navy chinos, white oxford shirt, cognac leather belt. Seated at a clean minimal desk, one hand resting naturally, engaged and approachable expression. Shot on Nikon Z9, 85mm f/1.4, warm key light + cool window fill. McKinsey-level professional imagery.`,

  outdoor_business: `Environmental business portrait of SUBJECTPERSON on a rooftop terrace of a modern office building, glass facades of city buildings behind, overcast sky creating perfect diffused light. Wearing charcoal wool coat over dark turtleneck. Standing near a glass railing, looking slightly off-camera with a thoughtful expression. Shot on Leica SL2, 90mm Summicron, natural overcast diffused light, subtle architectural bokeh. Premium brand campaign quality.`,
}

// Créditos por quantidade de fotos
const CREDIT_COSTS: Record<number, number> = { 1: 1, 3: 2, 5: 3 }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) throw new Error('Unauthorized')

    const { scenario, quantity, profile_id } = await req.json()
    // scenario: keyof SCENARIO_PROMPTS
    // quantity: 1 | 3 | 5
    // profile_id: string

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

    // 2. Busca perfil com reference_image_url
    const { data: profile } = await supabase
      .from('client_photo_profiles')
      .select('reference_image_url, lora_url, training_status')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.training_status !== 'completed') {
      throw new Error('Perfil de fotos não está pronto. Complete o treinamento primeiro.')
    }

    if (!profile.reference_image_url) {
      throw new Error('Imagem de referência não encontrada.')
    }

    // 3. Baixa a imagem de referência e converte para base64
    const refImageResponse = await fetch(profile.reference_image_url)
    const refImageBuffer = await refImageResponse.arrayBuffer()
    // Chunked base64 to avoid stack overflow on large buffers
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

    // 4. Chama Imagen 3 via Vertex AI com referenceImages
    const scenarioPrompt = SCENARIO_PROMPTS[scenario] ?? SCENARIO_PROMPTS.executive_office
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    // Vertex AI Imagen 3 endpoint com subject reference
    const imagenEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${Deno.env.get('GCLOUD_PROJECT_ID')}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`

    const generatedUrls: string[] = []

    for (let i = 0; i < quantity; i++) {
      // Variação de seed para fotos diferentes mas mesma pessoa
      const seed = Math.floor(Math.random() * 1000000)

      const imagenPayload = {
        instances: [{
          prompt: scenarioPrompt,
          referenceImages: [{
            referenceType: 'REFERENCE_TYPE_SUBJECT',
            referenceId: 1,
            referenceImage: {
              bytesBase64Encoded: refImageBase64,
              mimeType: 'image/jpeg',
            },
            subjectImageConfig: {
              subjectType: 'SUBJECT_TYPE_PERSON',
            },
          }],
        }],
        parameters: {
          sampleCount: 1,
          seed: seed,
          aspectRatio: '9:16', // 1080x1920 portrait
          safetySetting: 'block_some',
          addWatermark: false,
          personGeneration: 'allow_all',
        },
      }

      const imagenResponse = await fetch(imagenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${geminiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imagenPayload),
      })

      if (!imagenResponse.ok) {
        const errText = await imagenResponse.text()
        throw new Error(`Imagen 3 error: ${errText}`)
      }

      const imagenData = await imagenResponse.json()
      const generatedBase64 = imagenData.predictions?.[0]?.bytesBase64Encoded

      if (!generatedBase64) throw new Error('Imagen 3 retornou sem imagem')

      // 5. Salva foto gerada no Supabase Storage com TTL de 7 dias
      const buffer = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0))
      const filePath = `${user.id}/${profile_id}/${scenario}_${Date.now()}_${i}.jpg`

      const { error: uploadErr } = await supabase.storage
        .from('studio-generated-photos')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (uploadErr) throw uploadErr

      // URL com 7 dias de validade
      const { data: signedData } = await supabase.storage
        .from('studio-generated-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)

      if (signedData?.signedUrl) generatedUrls.push(signedData.signedUrl)
    }

    // 6. Registra a sessão
    const { data: shoot } = await supabase
      .from('photo_shoots')
      .insert({
        user_id: user.id,
        profile_id,
        scenario,
        quantity,
        generated_photo_urls: generatedUrls,
        reference_image_url: profile.reference_image_url,
        credits_used: creditCost,
      })
      .select()
      .single()

    // 7. Desconta créditos
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
      JSON.stringify({ success: true, photos: generatedUrls, shoot_id: shoot?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('studio-generate-photos error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

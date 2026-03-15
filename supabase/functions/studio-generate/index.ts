import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StudioGenerateRequest {
  content_type: 'short_video' | 'youtube_video';
  theme: string;
  objective: 'educate' | 'sell' | 'entertain' | 'authority' | 'viral';
  tone: 'direct' | 'didactic' | 'casual' | 'inspirational' | 'provocative';
  audience: string;
  audience_level: 'beginner' | 'intermediate' | 'advanced';
  reference_channel?: string;
  keywords?: string;
}

const objectiveLabels: Record<string, string> = {
  educate: 'Educar',
  sell: 'Vender',
  entertain: 'Entreter',
  authority: 'Gerar Autoridade',
  viral: 'Viralizar',
};

const toneLabels: Record<string, string> = {
  direct: 'Direto e objetivo',
  didactic: 'Didático',
  casual: 'Descontraído',
  inspirational: 'Inspiracional',
  provocative: 'Provocativo',
};

const audienceLevelLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Credit check ───
  let { data: credits, error: creditsError } = await supabase
    .from('studio_credits')
    .select('*')
    .eq('user_id', user.id)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (creditsError && creditsError.code !== 'PGRST116') {
    return new Response(JSON.stringify({ error: 'Erro ao verificar créditos' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();

  // Lazy renewal: if period expired, reset credits
  if (credits && new Date(credits.period_end) < now) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: renewed } = await supabase
      .from('studio_credits')
      .update({ credits_available: 10, credits_used: 0, period_start: periodStart, period_end: periodEnd })
      .eq('id', credits.id)
      .select()
      .single();
    credits = renewed;
  }

  // First-time user: create credits row
  if (!credits) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: newCredits, error: insertError } = await supabase
      .from('studio_credits')
      .insert({ user_id: user.id, credits_available: 10, credits_used: 0, period_start: periodStart, period_end: periodEnd })
      .select()
      .single();
    if (insertError) {
      return new Response(JSON.stringify({ error: 'Erro ao criar créditos' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    credits = newCredits;
  }

  if (credits.credits_available <= 0) {
    return new Response(JSON.stringify({ error: 'Créditos esgotados', credits_available: 0, period_end: credits.period_end }), {
      status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Parse request body ───
  const body: StudioGenerateRequest = await req.json();

  if (!body.theme || !body.content_type || !body.objective || !body.tone || !body.audience) {
    return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const contentTypeLabel = body.content_type === 'short_video'
    ? 'Short Video (até 90 segundos — Instagram Reels, YouTube Shorts, TikTok)'
    : 'Vídeo YouTube (3-20 minutos)';

  const prompt = `Crie um roteiro profissional completo para ${contentTypeLabel}.

**Tema**: ${body.theme}
**Objetivo**: ${objectiveLabels[body.objective]}
**Tom de voz**: ${toneLabels[body.tone]}
**Público-alvo**: ${body.audience} (nível: ${audienceLevelLabels[body.audience_level]})
${body.reference_channel ? `**Referência de estilo**: ${body.reference_channel}` : ''}
${body.keywords ? `**Palavras-chave obrigatórias**: ${body.keywords}` : ''}

O roteiro deve incluir:
1. Título principal e 2 variações
2. Hook de abertura (primeiros 3 segundos)
3. Desenvolvimento com timestamps sugeridos
4. CTA final
5. Sugestões de hashtags (5-8 tags)

Escreva em português brasileiro.`;

  // ─── LLM call via Lovable AI Gateway ───
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const llmRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'Você é um especialista em criação de conteúdo para redes sociais brasileiras. Cria roteiros profissionais, envolventes e otimizados para retenção.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
      max_tokens: 2000,
    }),
  });

  if (!llmRes.ok) {
    if (llmRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições excedido, tente novamente em breve.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (llmRes.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos da plataforma esgotados.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const errorText = await llmRes.text();
    console.error('AI gateway error:', llmRes.status, errorText);
    return new Response(JSON.stringify({ error: 'Erro ao gerar roteiro' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── Debit credit (fire-and-forget) ───
  supabase
    .from('studio_credits')
    .update({ credits_available: credits.credits_available - 1, credits_used: credits.credits_used + 1 })
    .eq('id', credits.id)
    .then();

  return new Response(llmRes.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'X-Credits-Remaining': String(credits.credits_available - 1),
    },
  });
});

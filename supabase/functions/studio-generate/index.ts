import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logAiUsage } from '../_shared/log-ai-usage.ts';

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
  recording_location?: string;
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

  const locationContext = body.recording_location
    ? `\n**Local de gravação**: ${body.recording_location}`
    : '';

  const locationInstructions = body.recording_location
    ? `
INSTRUÇÕES DE CENÁRIO E LOCAL DE GRAVAÇÃO:
- O vídeo será gravado em: ${body.recording_location}
- Adapte as instruções visuais e de cenário para este ambiente específico
- Inclua sugestões práticas de posicionamento de câmera para este local
- Sugira elementos visuais do ambiente que podem ser usados como B-roll ou cenário
- Adapte o tom e a energia do roteiro ao contexto do local (ex: consultório = mais profissional; casa = mais íntimo e acolhedor; estúdio = mais produzido; escritório = autoridade corporativa)
`
    : '';

  const prompt = `Crie um roteiro profissional completo para ${contentTypeLabel}.

**Tema**: ${body.theme}
**Objetivo**: ${objectiveLabels[body.objective]}
**Tom de voz**: ${toneLabels[body.tone]}
**Público-alvo**: ${body.audience} (nível: ${audienceLevelLabels[body.audience_level]})${locationContext}
${body.reference_channel ? `**Referência de estilo**: ${body.reference_channel}` : ''}
${body.keywords ? `**Palavras-chave obrigatórias**: ${body.keywords}` : ''}

${locationInstructions}

O roteiro DEVE seguir esta estrutura em Markdown:

## Títulos
Título principal e 2 variações alternativas.

## Gancho de Abertura (Hook)
Os primeiros 3-5 segundos são CRÍTICOS. Crie um gancho visual + verbal poderoso:
- **Gancho Visual**: Descreva exatamente o que aparece na tela (enquadramento, gesto, texto sobreposto, objeto)
- **Gancho Verbal**: A frase exata que a pessoa vai falar (deve criar curiosidade ou choque)
- **Texto na tela**: O texto que aparece sobreposto no vídeo nos primeiros segundos

## Roteiro Completo
Escreva o roteiro com timestamps sugeridos. Para cada bloco inclua:
- **[Timestamp]** (ex: **[0:00-0:03]**, **[0:15-0:30]**)
- **Fala**: O texto exato que a pessoa vai dizer
- **Visual**: O que aparece na tela (B-roll, texto animado, corte, gesto)
- **Gancho de retenção**: A cada 15-30 segundos, inclua um micro-gancho para manter atenção (pergunta retórica, revelação, "mas espera...", zoom dramático)

## Ganchos Visuais
Liste 5-8 sugestões de elementos visuais que devem aparecer ao longo do vídeo:
- Textos animados
- Cortes dinâmicos
- Zoom dramático
- Gestos ou expressões faciais
- Objetos ou props
- Mudanças de ângulo

## CTA Final
Chamada para ação clara e direta. Inclua:
- Fala exata do CTA
- Texto na tela do CTA
- Sugestão de gesto/enquadramento final

## Hashtags
5-8 hashtags otimizadas para alcance e nicho.

## Dicas de Gravação
3-5 dicas práticas específicas para este roteiro (iluminação, ângulo, edição).

REGRAS IMPORTANTES:
- Escreva em português brasileiro
- Use linguagem natural e conversacional
- Cada gancho visual deve ser ESPECÍFICO e ACIONÁVEL (não genérico)
- Os timestamps devem ser realistas para o formato escolhido
- Use negrito (**texto**) para destacar falas e instruções visuais
- NÃO use emojis em nenhuma parte do roteiro
- Formate o texto como Markdown válido`;

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
        { role: 'system', content: 'Você é um roteirista profissional e estrategista de conteúdo para redes sociais brasileiras. Você cria roteiros envolventes, otimizados para retenção e com ganchos visuais específicos. Sempre formate sua resposta como Markdown válido e bem estruturado. NUNCA use emojis.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
      max_tokens: 3000,
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

  // ─── Log AI usage (fire-and-forget) ───
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user: authUser } } = await supabase.auth.getUser(jwt);
  logAiUsage({
    userId: authUser?.id,
    functionName: 'studio-generate',
    model: 'google/gemini-3-flash-preview',
    isStreaming: true,
  });

  return new Response(llmRes.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'X-Credits-Remaining': String(credits.credits_available - 1),
    },
  });
});

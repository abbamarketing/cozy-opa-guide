import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LogAiUsageParams {
  userId?: string | null;
  functionName: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isStreaming?: boolean;
}

/**
 * Fire-and-forget AI usage logging.
 * Uses service role to bypass RLS.
 */
export function logAiUsage(params: LogAiUsageParams) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    sb.from('ai_usage_logs').insert({
      user_id: params.userId ?? null,
      function_name: params.functionName,
      model: params.model,
      prompt_tokens: params.promptTokens ?? 0,
      completion_tokens: params.completionTokens ?? 0,
      total_tokens: params.totalTokens ?? 0,
      is_streaming: params.isStreaming ?? false,
    }).then(({ error }) => {
      if (error) console.error('logAiUsage error:', error.message);
    });
  } catch (e) {
    console.error('logAiUsage catch:', e);
  }
}

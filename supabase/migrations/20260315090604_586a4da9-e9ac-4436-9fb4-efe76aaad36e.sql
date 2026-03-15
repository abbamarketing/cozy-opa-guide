
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  is_streaming BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_usage_logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert ai_usage_logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_logs_function ON public.ai_usage_logs (function_name);

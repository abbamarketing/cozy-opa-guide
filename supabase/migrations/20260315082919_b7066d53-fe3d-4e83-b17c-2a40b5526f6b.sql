
-- Drop existing table and all its policies/triggers
DROP TABLE IF EXISTS public.studio_credits CASCADE;

-- Drop existing function if any
DROP FUNCTION IF EXISTS update_studio_credits_updated_at();

-- Create new studio_credits table
CREATE TABLE public.studio_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_available INTEGER NOT NULL DEFAULT 10,
  credits_used INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.studio_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own studio credits"
  ON public.studio_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own studio credits"
  ON public.studio_credits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own studio credits"
  ON public.studio_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all studio credits"
  ON public.studio_credits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Unique index per user/period
CREATE UNIQUE INDEX IF NOT EXISTS studio_credits_user_period_idx
  ON public.studio_credits (user_id, period_start);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_studio_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER studio_credits_updated_at
  BEFORE UPDATE ON public.studio_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_studio_credits_updated_at();

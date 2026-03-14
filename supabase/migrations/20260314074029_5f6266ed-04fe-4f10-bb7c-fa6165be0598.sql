CREATE TABLE public.studio_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits_remaining integer DEFAULT 10,
  credits_used_month integer DEFAULT 0,
  last_reset_at date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_credits_own_select" ON public.studio_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "studio_credits_own_update" ON public.studio_credits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "studio_credits_admin_all" ON public.studio_credits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "studio_credits_insert_service" ON public.studio_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_studio_credits_user ON public.studio_credits(user_id);
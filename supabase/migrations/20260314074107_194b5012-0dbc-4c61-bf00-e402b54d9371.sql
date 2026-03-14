CREATE TABLE public.studio_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text,
  topic text,
  objective text,
  tone text,
  audience text,
  audience_level text,
  reference text,
  keywords text,
  generated_script text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_scripts_own_select" ON public.studio_scripts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "studio_scripts_own_insert" ON public.studio_scripts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "studio_scripts_admin_all" ON public.studio_scripts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_studio_scripts_user ON public.studio_scripts(user_id, created_at DESC);
CREATE TABLE public.studio_photo_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_photo_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_interest_insert_any" ON public.studio_photo_interest
  FOR INSERT WITH CHECK (true);

CREATE POLICY "photo_interest_admin_select" ON public.studio_photo_interest
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
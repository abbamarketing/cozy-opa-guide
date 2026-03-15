
-- Perfil fotográfico do cliente
CREATE TABLE IF NOT EXISTS public.client_photo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_document jsonb NOT NULL DEFAULT '{}',
  reference_photo_paths text[] NOT NULL DEFAULT '{}',
  photos_analyzed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.client_photo_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON public.client_photo_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Sessões de geração de fotos
CREATE TABLE IF NOT EXISTS public.photo_shoots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario text NOT NULL CHECK (scenario IN ('studio', 'clinic', 'office', 'outdoor')),
  quantity int NOT NULL CHECK (quantity IN (1, 3, 5)),
  credits_used int NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  generated_photo_paths text[] DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_shoots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_shoots" ON public.photo_shoots
  FOR ALL USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_client_photo_profiles_updated_at
  BEFORE UPDATE ON public.client_photo_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_shoots_updated_at
  BEFORE UPDATE ON public.photo_shoots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

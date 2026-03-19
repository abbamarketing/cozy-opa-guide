-- =============================================
-- Auto-assign new users to default project (self-service flow)
-- =============================================

-- 1. Create a default project template for self-service signups
INSERT INTO public.custom_projects (
  project_name,
  description,
  youtube_videos, instagram_videos,
  include_thumbnails, include_covers,
  include_script, include_capture,
  monthly_value,
  payment_frequency,
  max_revisions,
  deadline,
  active
) VALUES (
  'Standard (Self-Service)',
  'Plano padrão para cadastros via landing page. Reels, Shorts e TikTok até 90s. Fila ilimitada. SLA 72h.',
  0, 0,
  false, false,
  false, false,
  490.00,
  'monthly',
  999, -- unlimited revisions
  '72h',
  true
) ON CONFLICT DO NOTHING;

-- 2. Add is_default flag to custom_projects
ALTER TABLE public.custom_projects
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Mark the self-service project as default
UPDATE public.custom_projects
  SET is_default = true
  WHERE project_name = 'Standard (Self-Service)';

-- 3. Update handle_new_user to auto-create user_project + assign profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_project_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  -- Default role is 'client'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');

  -- Find default project
  SELECT id INTO default_project_id
  FROM public.custom_projects
  WHERE is_default = true AND active = true
  LIMIT 1;

  -- If a default project exists, auto-assign
  IF default_project_id IS NOT NULL THEN
    -- Create user_project with pending_payment
    INSERT INTO public.user_projects (
      user_id,
      custom_project_id,
      status,
      client_type,
      youtube_reserved, youtube_approved,
      instagram_reserved, instagram_approved,
      thumbnails_reserved, thumbnails_approved,
      covers_reserved, covers_approved,
      captures_reserved, captures_approved
    ) VALUES (
      NEW.id,
      default_project_id,
      'pending_payment',
      'custom',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    );

    -- Update profile with assigned project
    UPDATE public.profiles
      SET assigned_project_id = default_project_id
      WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

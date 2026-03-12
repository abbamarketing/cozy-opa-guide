
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'client');
CREATE TYPE public.payment_frequency_type AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE public.deadline_type AS ENUM ('24h', '48h', '72h');
CREATE TYPE public.user_project_status AS ENUM ('pending_payment', 'active', 'suspended', 'cancelled');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'in_progress', 'review', 'revision', 'approved', 'cancelled');
CREATE TYPE public.delivery_type AS ENUM ('youtube_video', 'instagram_video', 'thumbnail', 'cover');
CREATE TYPE public.editor_status AS ENUM ('available', 'busy', 'inactive');

-- =============================================
-- TABLE: user_roles (RBAC)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- UPDATE profiles table (add missing columns)
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;

-- Drop old simple role column, we now use user_roles table
-- Keep it for backward compat but it won't be authoritative
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update profiles RLS to allow admins to see all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TABLE: editors
-- =============================================
CREATE TABLE public.editors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  specialty TEXT,
  portfolio_url TEXT,
  status public.editor_status NOT NULL DEFAULT 'available',
  max_concurrent_projects INTEGER NOT NULL DEFAULT 5,
  active_projects INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.editors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view own record"
  ON public.editors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage editors"
  ON public.editors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_editors_user_id ON public.editors(user_id);
CREATE INDEX idx_editors_status ON public.editors(status);

CREATE TRIGGER update_editors_updated_at
  BEFORE UPDATE ON public.editors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: custom_projects
-- =============================================
CREATE TABLE public.custom_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  description TEXT,
  
  -- Monthly deliverables
  youtube_videos INTEGER NOT NULL DEFAULT 0,
  instagram_videos INTEGER NOT NULL DEFAULT 0,
  include_thumbnails BOOLEAN NOT NULL DEFAULT false,
  include_covers BOOLEAN NOT NULL DEFAULT false,
  include_script BOOLEAN NOT NULL DEFAULT false,
  include_capture BOOLEAN NOT NULL DEFAULT false,
  
  -- Commercial
  monthly_value DECIMAL(10,2) NOT NULL,
  payment_frequency public.payment_frequency_type NOT NULL DEFAULT 'monthly',
  
  -- Technical
  max_revisions INTEGER NOT NULL DEFAULT 2,
  deadline public.deadline_type NOT NULL DEFAULT '48h',
  
  -- Stripe
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  
  -- Control
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_projects ENABLE ROW LEVEL SECURITY;

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_custom_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (NEW.youtube_videos > 0 OR NEW.instagram_videos > 0 OR NEW.include_thumbnails OR NEW.include_covers) THEN
    RAISE EXCEPTION 'At least one deliverable must be configured';
  END IF;
  IF NEW.include_capture AND NOT (NEW.youtube_videos > 0 OR NEW.instagram_videos > 0) THEN
    RAISE EXCEPTION 'Capture requires at least one video type configured';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_custom_project_trigger
  BEFORE INSERT OR UPDATE ON public.custom_projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_custom_project();

CREATE TRIGGER update_custom_projects_updated_at
  BEFORE UPDATE ON public.custom_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: only admins can manage projects, clients can view active ones
CREATE POLICY "Admins can manage custom_projects"
  ON public.custom_projects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active projects"
  ON public.custom_projects FOR SELECT
  USING (active = true);

CREATE INDEX idx_custom_projects_active ON public.custom_projects(active);
CREATE INDEX idx_custom_projects_created_by ON public.custom_projects(created_by);

-- =============================================
-- TABLE: user_projects
-- =============================================
CREATE TABLE public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_project_id UUID NOT NULL REFERENCES public.custom_projects(id),
  editor_id UUID REFERENCES public.editors(id),
  
  -- Status
  status public.user_project_status NOT NULL DEFAULT 'pending_payment',
  stripe_subscription_id TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  
  -- Monthly quotas reserved
  youtube_reserved INTEGER NOT NULL DEFAULT 0,
  instagram_reserved INTEGER NOT NULL DEFAULT 0,
  thumbnails_reserved INTEGER NOT NULL DEFAULT 0,
  covers_reserved INTEGER NOT NULL DEFAULT 0,
  
  -- Quotas approved
  youtube_approved INTEGER NOT NULL DEFAULT 0,
  instagram_approved INTEGER NOT NULL DEFAULT 0,
  thumbnails_approved INTEGER NOT NULL DEFAULT 0,
  covers_approved INTEGER NOT NULL DEFAULT 0,
  
  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  
  -- Onboarding
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tour_completed BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own user_projects"
  ON public.user_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user_projects"
  ON public.user_projects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view assigned user_projects"
  ON public.user_projects FOR SELECT
  USING (
    editor_id IN (SELECT id FROM public.editors WHERE user_id = auth.uid())
  );

CREATE INDEX idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX idx_user_projects_status ON public.user_projects(status);
CREATE INDEX idx_user_projects_editor_id ON public.user_projects(editor_id);
CREATE INDEX idx_user_projects_period ON public.user_projects(current_period_start, current_period_end);

CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON public.user_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: deliveries
-- =============================================
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  editor_id UUID REFERENCES public.editors(id),
  
  -- Delivery info
  title TEXT NOT NULL,
  description TEXT,
  delivery_type public.delivery_type NOT NULL,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  
  -- Files
  file_url TEXT,
  thumbnail_url TEXT,
  
  -- Revisions
  revision_count INTEGER NOT NULL DEFAULT 0,
  max_revisions INTEGER NOT NULL DEFAULT 2,
  revision_notes TEXT,
  
  -- Dates
  due_date TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries of their projects"
  ON public.deliveries FOR SELECT
  USING (
    user_project_id IN (SELECT id FROM public.user_projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Editors can manage their deliveries"
  ON public.deliveries FOR ALL
  USING (
    editor_id IN (SELECT id FROM public.editors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all deliveries"
  ON public.deliveries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_deliveries_user_project_id ON public.deliveries(user_project_id);
CREATE INDEX idx_deliveries_editor_id ON public.deliveries(editor_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_type ON public.deliveries(delivery_type);

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: onboarding_briefings
-- =============================================
CREATE TABLE public.onboarding_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_project_id UUID REFERENCES public.user_projects(id) ON DELETE SET NULL,
  
  -- Brand info
  brand_name TEXT NOT NULL,
  brand_description TEXT,
  target_audience TEXT,
  brand_colors JSONB DEFAULT '[]'::jsonb,
  brand_fonts JSONB DEFAULT '[]'::jsonb,
  logo_url TEXT,
  
  -- Content preferences
  content_style TEXT,
  reference_channels TEXT[],
  preferred_music_style TEXT,
  
  -- Technical
  intro_url TEXT,
  outro_url TEXT,
  additional_notes TEXT,
  
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own briefings"
  ON public.onboarding_briefings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all briefings"
  ON public.onboarding_briefings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view briefings of assigned projects"
  ON public.onboarding_briefings FOR SELECT
  USING (
    user_project_id IN (
      SELECT id FROM public.user_projects
      WHERE editor_id IN (SELECT id FROM public.editors WHERE user_id = auth.uid())
    )
  );

CREATE INDEX idx_briefings_user_id ON public.onboarding_briefings(user_id);
CREATE INDEX idx_briefings_user_project_id ON public.onboarding_briefings(user_project_id);

CREATE TRIGGER update_briefings_updated_at
  BEFORE UPDATE ON public.onboarding_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Update handle_new_user to also create user_roles entry
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  -- Default role is 'client'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

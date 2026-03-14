ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'custom';
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS subscription_tier text;
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS sla_hours integer;
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 1;
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS studio_access boolean DEFAULT false;
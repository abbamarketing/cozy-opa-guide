
-- Add assigned_project_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_project_id UUID REFERENCES public.custom_projects(id);

-- Allow admins to insert into user_projects (existing policy covers ALL but let's be explicit)
CREATE POLICY "Admins can insert user_projects"
  ON public.user_projects FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

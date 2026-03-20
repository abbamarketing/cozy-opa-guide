CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_role text NOT NULL DEFAULT 'viewer' CHECK (display_role IN ('admin', 'editor', 'viewer', 'manager')),
  permissions jsonb NOT NULL DEFAULT '{
    "admin_tabs": ["overview"],
    "can_create_delivery": false,
    "can_edit_delivery": false,
    "can_delete_delivery": false,
    "can_manage_clients": false,
    "can_manage_editors": false,
    "can_view_financials": false,
    "can_manage_projects": false,
    "can_export_data": false
  }'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_active ON public.team_members(is_active);

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Only god users can manage team members
CREATE POLICY "God users can do everything with team_members"
  ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'god'
    )
  );

-- Team members can read their own record
CREATE POLICY "Team members can read own record"
  ON public.team_members
  FOR SELECT
  USING (user_id = auth.uid());


-- 1. Add max_captures to custom_projects
ALTER TABLE public.custom_projects ADD COLUMN IF NOT EXISTS max_captures INTEGER NOT NULL DEFAULT 1;

-- 2. Add capture quota fields to user_projects
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS captures_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS captures_approved INTEGER NOT NULL DEFAULT 0;

-- 3. Create subtask status type
CREATE TYPE public.subtask_status AS ENUM ('pending', 'in_progress', 'completed', 'approved');

-- 4. Create capture session status type  
CREATE TYPE public.capture_session_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');

-- 5. Project subtask templates (admin defines per project)
CREATE TABLE public.project_subtask_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_project_id UUID NOT NULL REFERENCES public.custom_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_types TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_subtask_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subtask templates" ON public.project_subtask_templates
  FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active templates" ON public.project_subtask_templates
  FOR SELECT TO authenticated USING (is_active = true);

-- 6. Delivery subtasks (instances per delivery)
CREATE TABLE public.delivery_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.project_subtask_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status public.subtask_status NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delivery subtasks" ON public.delivery_subtasks
  FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view subtasks of their deliveries" ON public.delivery_subtasks
  FOR SELECT TO authenticated
  USING (delivery_id IN (
    SELECT d.id FROM deliveries d
    JOIN user_projects up ON up.id = d.user_project_id
    WHERE up.user_id = auth.uid()
  ));

CREATE POLICY "Clients can update subtasks requiring approval" ON public.delivery_subtasks
  FOR UPDATE TO authenticated
  USING (
    requires_approval = true
    AND delivery_id IN (
      SELECT d.id FROM deliveries d
      JOIN user_projects up ON up.id = d.user_project_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage subtasks of their deliveries" ON public.delivery_subtasks
  FOR ALL TO authenticated
  USING (delivery_id IN (
    SELECT d.id FROM deliveries d
    WHERE d.editor_id IN (
      SELECT e.id FROM editors e WHERE e.user_id = auth.uid()
    )
  ));

-- 7. Capture sessions (scheduling)
CREATE TABLE public.capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  location_name TEXT,
  address TEXT,
  notes TEXT,
  status public.capture_session_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capture_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all capture sessions" ON public.capture_sessions
  FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their capture sessions" ON public.capture_sessions
  FOR SELECT TO authenticated
  USING (user_project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Clients can insert capture sessions" ON public.capture_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Editors can view assigned capture sessions" ON public.capture_sessions
  FOR SELECT TO authenticated
  USING (user_project_id IN (
    SELECT id FROM user_projects WHERE editor_id IN (
      SELECT e.id FROM editors e WHERE e.user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can update assigned capture sessions" ON public.capture_sessions
  FOR UPDATE TO authenticated
  USING (user_project_id IN (
    SELECT id FROM user_projects WHERE editor_id IN (
      SELECT e.id FROM editors e WHERE e.user_id = auth.uid()
    )
  ));

-- 8. Trigger: auto-create subtasks when delivery is created
CREATE OR REPLACE FUNCTION public.auto_create_delivery_subtasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_custom_project_id UUID;
  v_template RECORD;
BEGIN
  -- Get the custom_project_id from the user_project
  SELECT up.custom_project_id INTO v_custom_project_id
  FROM user_projects up
  WHERE up.id = NEW.user_project_id;

  -- Create subtasks from active templates that match this delivery type
  FOR v_template IN
    SELECT * FROM project_subtask_templates
    WHERE custom_project_id = v_custom_project_id
      AND is_active = true
      AND NEW.delivery_type::text = ANY(delivery_types)
    ORDER BY sort_order ASC
  LOOP
    INSERT INTO delivery_subtasks (delivery_id, template_id, name, sort_order, requires_approval)
    VALUES (NEW.id, v_template.id, v_template.name, v_template.sort_order, v_template.requires_approval);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_subtasks
  AFTER INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_delivery_subtasks();

-- 9. Trigger: reserve capture quota on session create
CREATE OR REPLACE FUNCTION public.reserve_capture_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_projects
  SET captures_reserved = captures_reserved + 1
  WHERE id = NEW.user_project_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reserve_capture_quota
  AFTER INSERT ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.reserve_capture_quota();

-- 10. Trigger: approve capture quota on session completion
CREATE OR REPLACE FUNCTION public.approve_capture_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE user_projects
    SET 
      captures_approved = captures_approved + 1,
      captures_reserved = GREATEST(0, captures_reserved - 1)
    WHERE id = NEW.user_project_id;
  END IF;
  
  -- If cancelled, release the reserved quota
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE user_projects
    SET captures_reserved = GREATEST(0, captures_reserved - 1)
    WHERE id = NEW.user_project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_approve_capture_quota
  AFTER UPDATE ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.approve_capture_quota();

-- 11. Update reset_monthly_quotas to include captures
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_projects
  SET 
    youtube_reserved = 0,
    instagram_reserved = 0,
    thumbnails_reserved = 0,
    covers_reserved = 0,
    captures_reserved = 0,
    youtube_approved = 0,
    instagram_approved = 0,
    thumbnails_approved = 0,
    covers_approved = 0,
    captures_approved = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month'
  WHERE 
    current_period_end <= NOW()
    AND status = 'active';
END;
$$;

-- 12. Updated_at trigger for capture_sessions
CREATE TRIGGER trg_capture_sessions_updated_at
  BEFORE UPDATE ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Validation trigger for capture sessions (instead of CHECK)
CREATE OR REPLACE FUNCTION public.validate_capture_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_max_captures INTEGER;
  v_captures_used INTEGER;
  v_include_capture BOOLEAN;
BEGIN
  -- Check if project includes capture
  SELECT cp.include_capture, cp.max_captures
  INTO v_include_capture, v_max_captures
  FROM user_projects up
  JOIN custom_projects cp ON cp.id = up.custom_project_id
  WHERE up.id = NEW.user_project_id;

  IF NOT v_include_capture THEN
    RAISE EXCEPTION 'Este projeto não inclui captação presencial';
  END IF;

  -- Check quota
  SELECT captures_reserved + captures_approved INTO v_captures_used
  FROM user_projects WHERE id = NEW.user_project_id;

  IF v_captures_used >= v_max_captures THEN
    RAISE EXCEPTION 'Limite mensal de captações atingido (% de %)', v_captures_used, v_max_captures;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_capture_session
  BEFORE INSERT ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_capture_session();

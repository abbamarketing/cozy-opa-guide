
-- 1. Notify editor when client approves a subtask
CREATE OR REPLACE FUNCTION public.notify_subtask_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_editor_user_id UUID;
  v_delivery_title TEXT;
  v_client_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get editor user_id and delivery title
    SELECT e.user_id, d.title
    INTO v_editor_user_id, v_delivery_title
    FROM deliveries d
    LEFT JOIN editors e ON e.id = d.editor_id
    WHERE d.id = NEW.delivery_id;

    -- Get client name from the person who completed it
    IF NEW.completed_by IS NOT NULL THEN
      SELECT p.full_name INTO v_client_name
      FROM profiles p
      WHERE p.user_id = NEW.completed_by;
    END IF;

    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'subtask_approved',
        'Subtask Aprovada ✅',
        COALESCE(v_client_name, 'Cliente') || ' aprovou "' || NEW.name || '" em "' || COALESCE(v_delivery_title, 'Entrega') || '"',
        '/editor'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_subtask_approved
  AFTER UPDATE ON public.delivery_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subtask_approved();

-- 2. Notify client when editor completes a subtask
CREATE OR REPLACE FUNCTION public.notify_subtask_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id UUID;
  v_delivery_title TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NOT NEW.requires_approval THEN
    SELECT up.user_id, d.title
    INTO v_client_user_id, v_delivery_title
    FROM deliveries d
    JOIN user_projects up ON up.id = d.user_project_id
    WHERE d.id = NEW.delivery_id;

    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'subtask_completed',
        'Etapa Concluída 🎯',
        'A etapa "' || NEW.name || '" de "' || COALESCE(v_delivery_title, 'Entrega') || '" foi concluída',
        '/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_subtask_completed
  AFTER UPDATE ON public.delivery_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subtask_completed();

-- 3. Notify editor when capture session is created
CREATE OR REPLACE FUNCTION public.notify_capture_session_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  -- Get editor user_id
  SELECT e.user_id INTO v_editor_user_id
  FROM user_projects up
  JOIN editors e ON e.id = up.editor_id
  WHERE up.id = NEW.user_project_id;

  -- Get client name
  SELECT p.full_name INTO v_client_name
  FROM user_projects up
  JOIN profiles p ON p.user_id = up.user_id
  WHERE up.id = NEW.user_project_id;

  IF v_editor_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_editor_user_id,
      'capture_scheduled',
      'Captação Agendada 📹',
      COALESCE(v_client_name, 'Cliente') || ' agendou captação para ' || TO_CHAR(NEW.scheduled_date, 'DD/MM/YYYY') || COALESCE(' em ' || NEW.location_name, ''),
      '/editor'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_capture_session_created
  AFTER INSERT ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_capture_session_created();

-- 4. Notify client when capture session status changes
CREATE OR REPLACE FUNCTION public.notify_capture_session_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id UUID;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT up.user_id INTO v_client_user_id
  FROM user_projects up
  WHERE up.id = NEW.user_project_id;

  IF v_client_user_id IS NOT NULL THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_client_user_id, 'capture_confirmed', 'Captação Confirmada ✅', 'Sua captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi confirmada', '/dashboard');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_client_user_id, 'capture_completed', 'Captação Realizada 🎬', 'Captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi concluída com sucesso', '/dashboard');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_client_user_id, 'capture_cancelled', 'Captação Cancelada ❌', 'Captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi cancelada', '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_capture_session_status
  AFTER UPDATE ON public.capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_capture_session_status();

-- 5. Enable realtime for subtasks and capture sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.capture_sessions;

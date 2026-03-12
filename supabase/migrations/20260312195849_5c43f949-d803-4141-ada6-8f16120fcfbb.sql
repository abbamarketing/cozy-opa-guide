
-- =============================================
-- Comprehensive notification system for all delivery lifecycle events
-- =============================================

-- 1. Notify EDITOR when a new delivery is created by a client
CREATE OR REPLACE FUNCTION public.notify_new_delivery_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  -- Get editor user_id from user_project
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
      'new_assignment',
      'Nova Solicitação! 📋',
      'Cliente ' || COALESCE(v_client_name, 'Anônimo') || ' criou: "' || NEW.title || '"',
      '/editor'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Replace notify_delivery_completed to handle ALL status transitions
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id UUID;
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  -- Skip if status didn't change
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Get client user_id
  SELECT up.user_id INTO v_client_user_id
  FROM user_projects up
  WHERE up.id = NEW.user_project_id;

  -- Get editor user_id
  IF NEW.editor_id IS NOT NULL THEN
    SELECT e.user_id INTO v_editor_user_id
    FROM editors e
    WHERE e.id = NEW.editor_id;
  END IF;

  -- Get client name for editor notifications
  SELECT p.full_name INTO v_client_name
  FROM profiles p
  WHERE p.user_id = v_client_user_id;

  -- STATUS: in_progress → notify client that production started
  IF NEW.status = 'in_progress' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_ready',
        'Em Produção! 🎬',
        'Sua entrega "' || NEW.title || '" está sendo produzida',
        '/dashboard'
      );
    END IF;
  END IF;

  -- STATUS: review → notify client that delivery is ready for review
  IF NEW.status = 'review' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_completed',
        'Pronta para Revisão! 🎉',
        'Sua entrega "' || NEW.title || '" está pronta para sua aprovação',
        '/dashboard'
      );
    END IF;
  END IF;

  -- STATUS: revision → notify editor that client requested revision
  IF NEW.status = 'revision' THEN
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'revision_requested',
        'Revisão Solicitada 🔄',
        COALESCE(v_client_name, 'Cliente') || ' solicitou revisão em "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;

  -- STATUS: approved → notify editor
  IF NEW.status = 'approved' THEN
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_approved',
        'Entrega Aprovada! ✅',
        COALESCE(v_client_name, 'Cliente') || ' aprovou "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;

  -- STATUS: cancelled → notify both
  IF NEW.status = 'cancelled' THEN
    IF v_client_user_id IS NOT NULL AND v_client_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_ready',
        'Entrega Cancelada ❌',
        'A entrega "' || NEW.title || '" foi cancelada',
        '/dashboard'
      );
    END IF;
    IF v_editor_user_id IS NOT NULL AND v_editor_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_ready',
        'Entrega Cancelada ❌',
        'A entrega "' || NEW.title || '" foi cancelada',
        '/editor'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Notify when a new chat message is sent
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery_title TEXT;
  v_client_user_id UUID;
  v_editor_user_id UUID;
  v_sender_name TEXT;
  v_target_user_id UUID;
BEGIN
  -- Get delivery info
  SELECT d.title, up.user_id, e.user_id
  INTO v_delivery_title, v_client_user_id, v_editor_user_id
  FROM deliveries d
  JOIN user_projects up ON up.id = d.user_project_id
  LEFT JOIN editors e ON e.id = d.editor_id
  WHERE d.id = NEW.delivery_id;

  -- Get sender name
  SELECT p.full_name INTO v_sender_name
  FROM profiles p
  WHERE p.user_id = NEW.sender_id;

  -- Notify the OTHER user (not the sender)
  IF NEW.sender_id = v_client_user_id THEN
    v_target_user_id := v_editor_user_id;
  ELSE
    v_target_user_id := v_client_user_id;
  END IF;

  IF v_target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_target_user_id,
      'revision_requested',
      'Nova Mensagem 💬',
      COALESCE(v_sender_name, 'Usuário') || ' enviou uma mensagem em "' || COALESCE(v_delivery_title, 'Entrega') || '"',
      CASE WHEN v_target_user_id = v_client_user_id THEN '/dashboard' ELSE '/editor' END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- Drop old individual triggers if they exist
-- =============================================
DROP TRIGGER IF EXISTS tr_notify_delivery_completed ON deliveries;
DROP TRIGGER IF EXISTS tr_notify_revision_requested ON deliveries;
DROP TRIGGER IF EXISTS tr_notify_delivery_approved ON deliveries;
DROP TRIGGER IF EXISTS tr_notify_project_assigned ON user_projects;
DROP TRIGGER IF EXISTS tr_assign_editor ON deliveries;
DROP TRIGGER IF EXISTS tr_reserve_quota ON deliveries;
DROP TRIGGER IF EXISTS tr_approve_quota ON deliveries;

-- =============================================
-- Create all triggers
-- =============================================

-- Trigger: new delivery created → notify editor + assign editor + reserve quota
CREATE TRIGGER tr_notify_new_delivery
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_delivery_created();

CREATE TRIGGER tr_assign_editor
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION assign_editor_to_delivery();

CREATE TRIGGER tr_reserve_quota
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION reserve_quota_on_create();

-- Trigger: delivery status change → notify relevant parties + approve quota
CREATE TRIGGER tr_notify_status_change
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_status_change();

CREATE TRIGGER tr_approve_quota
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION approve_quota_on_approve();

-- Trigger: project assigned → notify client
CREATE TRIGGER tr_notify_project_assigned
  AFTER INSERT ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_assigned();

-- Trigger: new chat message → notify other party
CREATE TRIGGER tr_notify_chat_message
  AFTER INSERT ON delivery_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_chat_message();

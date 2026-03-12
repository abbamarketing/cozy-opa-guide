
-- Remove emojis from all notification trigger functions

CREATE OR REPLACE FUNCTION public.notify_delivery_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.status = 'review' AND OLD.status != 'review' THEN
    SELECT up.user_id INTO v_user_id
    FROM user_projects up
    WHERE up.id = NEW.user_project_id;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_user_id,
        'delivery_completed',
        'Entrega Concluída',
        'Sua entrega "' || NEW.title || '" está pronta para revisão',
        '/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_delivery_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_editor_user_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT e.user_id INTO v_editor_user_id
    FROM editors e
    WHERE e.id = NEW.editor_id;
    
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_approved',
        'Entrega Aprovada',
        'Cliente aprovou "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_project_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_name TEXT;
BEGIN
  SELECT project_name INTO v_project_name
  FROM custom_projects
  WHERE id = NEW.custom_project_id;
  
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'project_assigned',
    'Projeto Configurado',
    'Seu projeto "' || COALESCE(v_project_name, 'Novo Projeto') || '" foi configurado. Complete o onboarding para começar.',
    '/onboarding'
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_delivery_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  SELECT e.user_id INTO v_editor_user_id
  FROM user_projects up
  JOIN editors e ON e.id = up.editor_id
  WHERE up.id = NEW.user_project_id;

  SELECT p.full_name INTO v_client_name
  FROM user_projects up
  JOIN profiles p ON p.user_id = up.user_id
  WHERE up.id = NEW.user_project_id;

  IF v_editor_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_editor_user_id,
      'new_assignment',
      'Nova Solicitação',
      'Cliente ' || COALESCE(v_client_name, 'Anônimo') || ' criou: "' || NEW.title || '"',
      '/editor'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT up.user_id INTO v_client_user_id
  FROM user_projects up
  WHERE up.id = NEW.user_project_id;

  IF NEW.editor_id IS NOT NULL THEN
    SELECT e.user_id INTO v_editor_user_id
    FROM editors e
    WHERE e.id = NEW.editor_id;
  END IF;

  SELECT p.full_name INTO v_client_name
  FROM profiles p
  WHERE p.user_id = v_client_user_id;

  IF NEW.status = 'in_progress' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_ready',
        'Em Produção',
        'Sua entrega "' || NEW.title || '" está sendo produzida',
        '/dashboard'
      );
    END IF;
  END IF;

  IF NEW.status = 'review' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_completed',
        'Pronta para Revisão',
        'Sua entrega "' || NEW.title || '" está pronta para sua aprovação',
        '/dashboard'
      );
    END IF;
  END IF;

  IF NEW.status = 'revision' THEN
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'revision_requested',
        'Revisão Solicitada',
        COALESCE(v_client_name, 'Cliente') || ' solicitou revisão em "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;

  IF NEW.status = 'approved' THEN
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_approved',
        'Entrega Aprovada',
        COALESCE(v_client_name, 'Cliente') || ' aprovou "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;

  IF NEW.status = 'cancelled' THEN
    IF v_client_user_id IS NOT NULL AND v_client_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_client_user_id,
        'delivery_ready',
        'Entrega Cancelada',
        'A entrega "' || NEW.title || '" foi cancelada',
        '/dashboard'
      );
    END IF;
    IF v_editor_user_id IS NOT NULL AND v_editor_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_ready',
        'Entrega Cancelada',
        'A entrega "' || NEW.title || '" foi cancelada',
        '/editor'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery_title TEXT;
  v_client_user_id UUID;
  v_editor_user_id UUID;
  v_sender_name TEXT;
  v_target_user_id UUID;
BEGIN
  SELECT d.title, up.user_id, e.user_id
  INTO v_delivery_title, v_client_user_id, v_editor_user_id
  FROM deliveries d
  JOIN user_projects up ON up.id = d.user_project_id
  LEFT JOIN editors e ON e.id = d.editor_id
  WHERE d.id = NEW.delivery_id;

  SELECT p.full_name INTO v_sender_name
  FROM profiles p
  WHERE p.user_id = NEW.sender_id;

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
      'Nova Mensagem',
      COALESCE(v_sender_name, 'Usuário') || ' enviou uma mensagem em "' || COALESCE(v_delivery_title, 'Entrega') || '"',
      CASE WHEN v_target_user_id = v_client_user_id THEN '/dashboard' ELSE '/editor' END
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_subtask_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_editor_user_id UUID;
  v_delivery_title TEXT;
  v_client_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT e.user_id, d.title
    INTO v_editor_user_id, v_delivery_title
    FROM deliveries d
    LEFT JOIN editors e ON e.id = d.editor_id
    WHERE d.id = NEW.delivery_id;

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
        'Subtask Aprovada',
        COALESCE(v_client_name, 'Cliente') || ' aprovou "' || NEW.name || '" em "' || COALESCE(v_delivery_title, 'Entrega') || '"',
        '/editor'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_subtask_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'Etapa Concluída',
        'A etapa "' || NEW.name || '" de "' || COALESCE(v_delivery_title, 'Entrega') || '" foi concluída',
        '/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_capture_session_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_editor_user_id UUID;
  v_client_name TEXT;
BEGIN
  SELECT e.user_id INTO v_editor_user_id
  FROM user_projects up
  JOIN editors e ON e.id = up.editor_id
  WHERE up.id = NEW.user_project_id;

  SELECT p.full_name INTO v_client_name
  FROM user_projects up
  JOIN profiles p ON p.user_id = up.user_id
  WHERE up.id = NEW.user_project_id;

  IF v_editor_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_editor_user_id,
      'capture_scheduled',
      'Captação Agendada',
      COALESCE(v_client_name, 'Cliente') || ' agendou captação para ' || TO_CHAR(NEW.scheduled_date, 'DD/MM/YYYY') || COALESCE(' em ' || NEW.location_name, ''),
      '/editor'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_capture_session_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      VALUES (v_client_user_id, 'capture_confirmed', 'Captação Confirmada', 'Sua captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi confirmada', '/dashboard');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_client_user_id, 'capture_completed', 'Captação Realizada', 'Captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi concluída com sucesso', '/dashboard');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_client_user_id, 'capture_cancelled', 'Captação Cancelada', 'Captação do dia ' || TO_CHAR(NEW.scheduled_date, 'DD/MM') || ' foi cancelada', '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create function to call send-notification-email edge function via pg_net
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only process specific notification types that should send emails
  IF NEW.type NOT IN (
    'delivery_completed', 'delivery_ready', 'project_assigned',
    'revision_requested', 'delivery_approved', 'new_assignment', 'monthly_report'
  ) THEN
    RETURN NEW;
  END IF;

  -- Get config from vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  -- Call edge function via pg_net
  PERFORM net.http_post(
    url := COALESCE(v_supabase_url, '') || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message,
      'link', NEW.link
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_send_notification_email ON public.notifications;
CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();
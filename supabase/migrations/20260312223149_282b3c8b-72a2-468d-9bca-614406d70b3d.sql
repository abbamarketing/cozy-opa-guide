
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

  BEGIN
    -- Get config from vault
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;

    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    -- Only call if we have both values
    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the notification insert
    RAISE WARNING 'send_notification_email failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

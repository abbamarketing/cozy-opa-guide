CREATE OR REPLACE FUNCTION public.validate_capture_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_captures INTEGER;
  v_captures_used INTEGER;
  v_include_capture BOOLEAN;
  v_last_session_date DATE;
  v_scheduled_dow INTEGER;
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

  -- Rule 1: 72h minimum lead time (3 days)
  IF NEW.scheduled_date < (CURRENT_DATE + INTERVAL '3 days') THEN
    RAISE EXCEPTION 'A captação deve ser agendada com no mínimo 72 horas de antecedência';
  END IF;

  -- Rule 2: Weekdays only (1=Monday ... 7=Sunday in ISO)
  v_scheduled_dow := EXTRACT(ISODOW FROM NEW.scheduled_date);
  IF v_scheduled_dow > 5 THEN
    RAISE EXCEPTION 'Captações só podem ser agendadas de segunda a sexta-feira';
  END IF;

  -- Rule 3: Time must be between 08:00 and 18:00
  IF NEW.scheduled_time IS NOT NULL THEN
    IF NEW.scheduled_time < '08:00:00'::TIME OR NEW.scheduled_time > '18:00:00'::TIME THEN
      RAISE EXCEPTION 'O horário deve ser entre 08:00 e 18:00';
    END IF;
  END IF;

  -- Rule 4: 28-day cooldown from last confirmed session
  SELECT MAX(cs.scheduled_date) INTO v_last_session_date
  FROM capture_sessions cs
  WHERE cs.user_project_id = NEW.user_project_id
    AND cs.status IN ('confirmed', 'completed')
    AND cs.id IS DISTINCT FROM NEW.id;

  IF v_last_session_date IS NOT NULL AND (CURRENT_DATE - v_last_session_date) < 28 THEN
    RAISE EXCEPTION 'É necessário aguardar 28 dias desde o último agendamento (último: %)', v_last_session_date;
  END IF;

  RETURN NEW;
END;
$function$;
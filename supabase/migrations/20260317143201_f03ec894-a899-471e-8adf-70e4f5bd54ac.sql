CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_projects
  SET
    youtube_reserved    = 0,
    instagram_reserved  = 0,
    thumbnails_reserved = 0,
    covers_reserved     = 0,
    youtube_approved    = 0,
    instagram_approved  = 0,
    thumbnails_approved = 0,
    covers_approved     = 0,
    current_period_start = current_period_end,
    current_period_end   = current_period_end + INTERVAL '1 month',
    monthly_quota = CASE
      WHEN sla_hours IS NOT NULL AND sla_hours > 0 THEN
        FLOOR((
          SELECT COUNT(*) * 24
          FROM generate_series(
            current_period_end::date,
            (current_period_end + INTERVAL '1 month')::date - INTERVAL '1 day',
            '1 day'
          ) AS d
          WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
        ) / sla_hours)
      ELSE monthly_quota
    END
  WHERE current_period_end <= NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
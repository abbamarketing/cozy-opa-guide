-- Cria user_project para clientes Studio que compraram antes do fix
INSERT INTO public.user_projects (
  user_id, client_type, status, studio_access,
  current_period_start, current_period_end,
  youtube_reserved, youtube_approved,
  instagram_reserved, instagram_approved,
  thumbnails_reserved, thumbnails_approved,
  covers_reserved, covers_approved,
  captures_reserved, captures_approved,
  tour_completed
)
SELECT
  sc.user_id,
  'studio',
  'active',
  true,
  now(),
  now() + interval '1 year',
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  false
FROM public.studio_credits sc
LEFT JOIN public.user_projects up ON up.user_id = sc.user_id
WHERE up.id IS NULL;
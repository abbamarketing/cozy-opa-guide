
-- Remove duplicate briefings keeping only the most recent per user
DELETE FROM public.onboarding_briefings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.onboarding_briefings
  ORDER BY user_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.onboarding_briefings ADD CONSTRAINT onboarding_briefings_user_id_key UNIQUE (user_id);

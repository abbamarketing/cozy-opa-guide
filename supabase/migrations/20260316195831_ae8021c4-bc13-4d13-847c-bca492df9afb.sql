-- Rollback: remove anomalous studio_credits record with inflated credits
-- This cleans up a hardcoded UUID that was exposed in a previous migration
DELETE FROM public.studio_credits 
WHERE user_id = 'fa7a3a2d-348e-45bd-a44d-b0914bd37139' 
  AND credits_available = 9999;
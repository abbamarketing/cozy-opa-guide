-- 1. Drop the UNIQUE(user_id) constraint to allow multiple brand profiles per user
ALTER TABLE public.onboarding_briefings
  DROP CONSTRAINT IF EXISTS onboarding_briefings_user_id_key;

-- 2. Add new columns: display label + primary flag
ALTER TABLE public.onboarding_briefings
  ADD COLUMN IF NOT EXISTS display_label text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- 3. Backfill: existing briefings become the primary brand and inherit brand_name as label
UPDATE public.onboarding_briefings
SET is_primary = true,
    display_label = COALESCE(display_label, brand_name)
WHERE is_primary = false OR display_label IS NULL;

-- 4. Ensure at most ONE primary brand per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_briefings_one_primary_per_user
  ON public.onboarding_briefings (user_id)
  WHERE is_primary = true;

-- 5. Index for listing user's brands
CREATE INDEX IF NOT EXISTS onboarding_briefings_user_id_idx
  ON public.onboarding_briefings (user_id);

-- 6. Add brand_profile_id to deliveries (nullable for legacy rows)
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS brand_profile_id uuid REFERENCES public.onboarding_briefings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deliveries_brand_profile_id_idx
  ON public.deliveries (brand_profile_id);

-- 7. Backfill existing deliveries with the user's primary brand profile
UPDATE public.deliveries d
SET brand_profile_id = ob.id
FROM public.user_projects up
JOIN public.onboarding_briefings ob
  ON ob.user_id = up.user_id AND ob.is_primary = true
WHERE d.user_project_id = up.id
  AND d.brand_profile_id IS NULL;

-- 8. RLS policy so editors can view brand profiles linked to their deliveries
DROP POLICY IF EXISTS "Editors can view brand profiles of assigned deliveries" ON public.onboarding_briefings;
CREATE POLICY "Editors can view brand profiles of assigned deliveries"
ON public.onboarding_briefings
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT d.brand_profile_id
    FROM public.deliveries d
    WHERE d.editor_id IN (SELECT e.id FROM public.editors e WHERE e.user_id = auth.uid())
      AND d.brand_profile_id IS NOT NULL
  )
);
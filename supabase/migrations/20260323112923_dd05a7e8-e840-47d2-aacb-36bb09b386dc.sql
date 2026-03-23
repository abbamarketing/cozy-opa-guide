-- Fix 1: Add RLS policy so editors can view user_projects where they have deliveries assigned
-- This fixes the !inner join issue where editor can't see deliveries because user_projects.editor_id is NULL
CREATE POLICY "Editors can view projects with assigned deliveries"
ON public.user_projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT d.user_project_id 
    FROM deliveries d 
    WHERE d.editor_id IN (
      SELECT e.id FROM editors e WHERE e.user_id = auth.uid()
    )
  )
);

-- Fix 2: Also set the editor_id on existing user_projects where deliveries are assigned
UPDATE user_projects up
SET editor_id = (
  SELECT DISTINCT d.editor_id 
  FROM deliveries d 
  WHERE d.user_project_id = up.id 
  AND d.editor_id IS NOT NULL 
  LIMIT 1
)
WHERE up.editor_id IS NULL
AND EXISTS (
  SELECT 1 FROM deliveries d WHERE d.user_project_id = up.id AND d.editor_id IS NOT NULL
);

-- Fix 3: Allow clients to UPDATE their own deliveries (only pending/queue status)
CREATE POLICY "Clients can update their pending deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  status IN ('pending', 'queue')
  AND user_project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('pending', 'queue')
  AND user_project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  )
);

-- Fix 4: Allow clients to DELETE their own deliveries (only pending/queue status)
CREATE POLICY "Clients can delete their pending deliveries"
ON public.deliveries
FOR DELETE
TO authenticated
USING (
  status IN ('pending', 'queue')
  AND user_project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  )
);

-- Fix 5: Allow editors to view all profiles (needed for client names in editor dashboard)
CREATE POLICY "Editors can view client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM editors e WHERE e.user_id = auth.uid()
  )
);
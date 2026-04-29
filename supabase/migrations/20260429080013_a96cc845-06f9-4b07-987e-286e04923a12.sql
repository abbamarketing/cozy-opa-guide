
-- Remove the recursive policy
DROP POLICY IF EXISTS "Editors can view projects with assigned deliveries" ON public.user_projects;

-- SECURITY DEFINER function to check if a user (editor) has any delivery assigned for a given user_project
CREATE OR REPLACE FUNCTION public.editor_has_delivery_in_user_project(_user_id uuid, _user_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries d
    JOIN public.editors e ON e.id = d.editor_id
    WHERE e.user_id = _user_id
      AND d.user_project_id = _user_project_id
  );
$$;

-- Recreate the policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Editors can view projects with assigned deliveries"
ON public.user_projects
FOR SELECT
TO authenticated
USING (public.editor_has_delivery_in_user_project(auth.uid(), id));

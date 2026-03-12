CREATE POLICY "Clients can insert deliveries on their projects"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (
  user_project_id IN (
    SELECT id FROM public.user_projects WHERE user_id = auth.uid()
  )
);
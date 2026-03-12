
CREATE TABLE public.delivery_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  notes text NOT NULL,
  timestamp_marker text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_revisions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage delivery_revisions"
  ON public.delivery_revisions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Editors can view revisions for their deliveries
CREATE POLICY "Editors can view revisions of their deliveries"
  ON public.delivery_revisions FOR SELECT
  USING (delivery_id IN (
    SELECT id FROM public.deliveries
    WHERE editor_id IN (
      SELECT id FROM public.editors WHERE user_id = auth.uid()
    )
  ));

-- Users can manage revisions they requested
CREATE POLICY "Users can manage their own revisions"
  ON public.delivery_revisions FOR ALL
  USING (requested_by = auth.uid());


-- =============================================
-- TABLE: system_settings
-- =============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for deadline column on deliveries (not yet created)
CREATE INDEX IF NOT EXISTS idx_deliveries_due_date ON public.deliveries(due_date);

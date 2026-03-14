CREATE INDEX IF NOT EXISTS idx_deliveries_priority_queue
  ON public.deliveries(priority_level DESC, created_at ASC)
  WHERE status = 'queue';
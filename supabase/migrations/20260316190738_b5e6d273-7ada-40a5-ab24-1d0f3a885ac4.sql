
-- Create calendar_events table for admin manual events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outro',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  related_delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  related_session_id UUID REFERENCES public.capture_sessions(id) ON DELETE SET NULL,
  related_editor_id UUID REFERENCES public.editors(id) ON DELETE SET NULL,
  related_client_id UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Only admins can manage calendar events
CREATE POLICY "Admins can manage calendar events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- Create delivery_messages table for chat per delivery
CREATE TABLE public.delivery_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  timestamp_marker text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins can manage delivery_messages"
  ON public.delivery_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Sender can insert own messages
CREATE POLICY "Users can insert own messages"
  ON public.delivery_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- RLS: Client can view messages on their deliveries
CREATE POLICY "Clients can view messages on their deliveries"
  ON public.delivery_messages FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      JOIN user_projects up ON d.user_project_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS: Editors can view messages on their deliveries
CREATE POLICY "Editors can view messages on their deliveries"
  ON public.delivery_messages FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      WHERE d.editor_id IN (
        SELECT e.id FROM editors e WHERE e.user_id = auth.uid()
      )
    )
  );

-- Enable realtime for chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_messages;
  END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER set_updated_at_delivery_messages
  BEFORE UPDATE ON public.delivery_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

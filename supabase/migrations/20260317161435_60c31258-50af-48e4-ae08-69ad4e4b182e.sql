-- Create support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL,
  user_project_id  uuid        REFERENCES public.user_projects(id) ON DELETE SET NULL,
  client_type      text,
  title            text        NOT NULL,
  description      text        NOT NULL,
  status           text        NOT NULL DEFAULT 'open',
  admin_notes      text,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas seus próprios tickets
CREATE POLICY "user_select_own"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin vê e gerencia todos
CREATE POLICY "admin_all"
ON public.support_tickets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 1;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS raw_file_url text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS raw_drive_link text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS client_notes text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS is_exception boolean DEFAULT false;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS exception_notes text;
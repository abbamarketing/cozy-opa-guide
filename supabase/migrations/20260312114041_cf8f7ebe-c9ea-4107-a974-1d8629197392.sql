
-- Create storage bucket for ready videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ready-videos', 'ready-videos', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- RLS: Editors can upload to ready-videos
CREATE POLICY "Editors can upload ready videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ready-videos'
  AND EXISTS (SELECT 1 FROM public.editors WHERE user_id = auth.uid())
);

-- RLS: Editors can update their uploads
CREATE POLICY "Editors can update ready videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ready-videos'
  AND EXISTS (SELECT 1 FROM public.editors WHERE user_id = auth.uid())
);

-- RLS: Editors can delete their uploads
CREATE POLICY "Editors can delete ready videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ready-videos'
  AND EXISTS (SELECT 1 FROM public.editors WHERE user_id = auth.uid())
);

-- RLS: Authenticated users can view ready videos
CREATE POLICY "Authenticated can view ready videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ready-videos');

-- Add drive_link column to deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS drive_link text;

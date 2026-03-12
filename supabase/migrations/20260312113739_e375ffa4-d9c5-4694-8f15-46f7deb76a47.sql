
-- Create storage bucket for delivery files
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-files', 'delivery-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow editors to upload files to the delivery-files bucket
CREATE POLICY "Editors can upload delivery files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-files'
  AND EXISTS (
    SELECT 1 FROM public.editors WHERE user_id = auth.uid()
  )
);

-- Allow editors to update their uploaded files
CREATE POLICY "Editors can update delivery files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'delivery-files'
  AND EXISTS (
    SELECT 1 FROM public.editors WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to view delivery files
CREATE POLICY "Authenticated users can view delivery files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-files');

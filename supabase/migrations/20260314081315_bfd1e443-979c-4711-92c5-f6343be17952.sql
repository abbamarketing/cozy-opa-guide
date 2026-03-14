-- Create raw-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('raw-files', 'raw-files', false, 524288000)
ON CONFLICT (id) DO NOTHING;

-- RLS: clients can upload to their own folder
CREATE POLICY "Clients can upload raw files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'raw-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: clients can read their own files
CREATE POLICY "Clients can read own raw files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'raw-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: editors can read raw files
CREATE POLICY "Editors can read raw files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'raw-files' AND public.has_role(auth.uid(), 'editor'));

-- RLS: admins can manage all raw files
CREATE POLICY "Admins can manage all raw files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'raw-files' AND public.has_role(auth.uid(), 'admin'));
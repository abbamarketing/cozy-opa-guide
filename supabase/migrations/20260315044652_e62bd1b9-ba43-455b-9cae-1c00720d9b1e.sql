INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('brand-assets', 'brand-assets', true, 209715200, ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

CREATE POLICY "Users can upload brand assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read brand assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'brand-assets');

CREATE POLICY "Users can update own brand assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own brand assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
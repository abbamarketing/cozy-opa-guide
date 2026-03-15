
-- Bucket para fotos de referência (upload do cliente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-reference-photos',
  'studio-reference-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Bucket para fotos geradas pelo Imagen 3
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-generated-photos',
  'studio-generated-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS: usuário só acessa sua própria pasta
CREATE POLICY "users_own_references" ON storage.objects
  FOR ALL USING (
    bucket_id = 'studio-reference-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_own_generated" ON storage.objects
  FOR ALL USING (
    bucket_id = 'studio-generated-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

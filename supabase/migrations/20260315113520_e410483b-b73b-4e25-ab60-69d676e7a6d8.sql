-- Add columns to client_photo_profiles
ALTER TABLE client_photo_profiles
  ADD COLUMN IF NOT EXISTS lora_url TEXT,
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
  ADD COLUMN IF NOT EXISTS training_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fal_request_id TEXT,
  ADD COLUMN IF NOT EXISTS trigger_word TEXT DEFAULT 'SUBJECTPERSON';

-- Add columns to photo_shoots
ALTER TABLE photo_shoots
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
  ADD COLUMN IF NOT EXISTS lora_url TEXT;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_photo_profiles_user_status
  ON client_photo_profiles(user_id, training_status);

-- Create studio-lora-references bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('studio-lora-references', 'studio-lora-references', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policy for studio-lora-references bucket
CREATE POLICY "Users can manage own lora references"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'studio-lora-references' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'studio-lora-references' AND (storage.foldername(name))[1] = auth.uid()::text);
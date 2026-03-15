-- Allow zip uploads for LoRA training payloads
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/octet-stream'
  ],
  file_size_limit = 52428800
WHERE id = 'studio-reference-photos';
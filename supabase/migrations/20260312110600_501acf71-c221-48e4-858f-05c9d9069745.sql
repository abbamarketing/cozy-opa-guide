
-- Add missing columns to onboarding_briefings
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0EA5E9';
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS legend_style TEXT DEFAULT 'minimalist';
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS jump_cuts BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS remove_silences BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS use_emojis BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS use_icons BOOLEAN DEFAULT true;
ALTER TABLE public.onboarding_briefings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#86efac';

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

CREATE POLICY "Users can update their own logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

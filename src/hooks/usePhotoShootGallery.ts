import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const SCENARIO_LABELS: Record<string, string> = {
  executive_office: 'Executivo',
  startup_workspace: 'Startup',
  boardroom: 'Sala de Reunião',
  consulting_office: 'Escritório Consultivo',
  outdoor_business: 'Externo Corporativo',
  outdoor_rooftop: 'Terraço ao Entardecer',
  studio_editorial: 'Estúdio Editorial',
  fashion_dark_editorial: 'Editorial Dark',
  luxury_hotel_lobby: 'Lobby de Luxo',
  fashion_street: 'Rua Parisiense',
  golden_hour_outdoor: 'Golden Hour',
  cafe_lifestyle: 'Café',
  beach_sunset: 'Praia ao Pôr do Sol',
  forest_nature: 'Floresta',
  neon_cyberpunk: 'Neon Cyberpunk',
  vintage_film: 'Filme Vintage',
  moody_warehouse: 'Galpão Moody',
  studio_bw: 'P&B Clássico',
  home_office_creator: 'Home Office',
  wellness_spa: 'Wellness / Spa',
  urban_lifestyle: 'Lifestyle Urbano',
  // Legacy
  studio: 'Estúdio Fotográfico',
  clinic: 'Consultório / Clínica',
  office: 'Escritório Executivo',
  outdoor: 'Área Externa',
};

export interface PhotoShoot {
  id: string;
  scenario: string;
  scenario_label: string;
  quantity: number;
  generated_photo_paths: string[];
  photo_urls: string[];
  reference_image_url: string | null;
  credits_used: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  hours_remaining: number;
}

export const usePhotoShootGallery = () => {
  const { user } = useAuth();
  const [shoots, setShoots] = useState<PhotoShoot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShoots = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('photo_shoots')
        .select(`
          id,
          scenario,
          quantity,
          generated_photo_paths,
          reference_image_url,
          credits_used,
          created_at,
          expires_at,
          status
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Generate signed URLs for the stored paths
      const mapped: PhotoShoot[] = [];
      for (const s of data ?? []) {
        const paths = (s.generated_photo_paths as string[]) ?? [];
        const photoUrls: string[] = [];

        for (const path of paths) {
          const { data: signedData } = await supabase.storage
            .from('studio-generated-photos')
            .createSignedUrl(path, 60 * 60 * 24); // 24h signed URL
          if (signedData?.signedUrl) photoUrls.push(signedData.signedUrl);
        }

        const expiresAt = new Date(s.expires_at);
        const now = new Date();
        const hoursRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

        mapped.push({
          id: s.id,
          scenario: s.scenario,
          scenario_label: SCENARIO_LABELS[s.scenario] ?? s.scenario,
          quantity: s.quantity,
          generated_photo_paths: paths,
          photo_urls: photoUrls,
          reference_image_url: s.reference_image_url,
          credits_used: s.credits_used,
          created_at: s.created_at,
          expires_at: s.expires_at,
          is_active: expiresAt > now,
          hours_remaining: hoursRemaining,
        });
      }

      setShoots(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchShoots(); }, [fetchShoots]);

  return { shoots, isLoading, error, refetch: fetchShoots };
};

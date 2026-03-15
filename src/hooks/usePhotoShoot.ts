import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

type TrainingStatus = 'idle' | 'uploading' | 'training' | 'generating_reference' | 'completed' | 'failed';

interface PhotoProfile {
  id: string;
  training_status: TrainingStatus;
  reference_image_url: string | null;
  lora_url: string | null;
  updated_at: string;
}

interface UsePhotoShootReturn {
  profile: PhotoProfile | null;
  isLoading: boolean;
  trainingStatus: TrainingStatus;
  generatedPhotos: string[];
  isGenerating: boolean;
  uploadAndTrain: (files: File[]) => Promise<void>;
  generatePhotos: (scenario: string, quantity: 1 | 3 | 5) => Promise<void>;
  resetGenerated: () => void;
}

export const usePhotoShoot = (): UsePhotoShootReturn => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PhotoProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle');
  const [generatedPhotos, setGeneratedPhotos] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingAttemptsRef.current = 0;
  }, []);

  // Fetch existing profile on mount / polling
  const fetchProfile = useCallback(async () => {
    if (!user) return null;

    const { data } = await supabase
      .from('client_photo_profiles')
      .select('id, training_status, reference_image_url, lora_url, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    let status = (data.training_status ?? 'idle') as TrainingStatus;
    let profileData = data;

    // Auto-heal stale status: if LoRA exists but status stuck in generating_reference for >3min
    if (status === 'generating_reference' && data.lora_url) {
      const elapsedMs = Date.now() - new Date(data.updated_at).getTime();
      if (elapsedMs > 3 * 60 * 1000) {
        const { error } = await supabase
          .from('client_photo_profiles')
          .update({ training_status: 'completed' })
          .eq('id', data.id)
          .eq('user_id', user.id);

        if (!error) {
          status = 'completed';
          profileData = { ...data, training_status: 'completed' };
        }
      }
    }

    setProfile(profileData as PhotoProfile);
    setTrainingStatus(status);
    return status;
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingAttemptsRef.current = 0;
    pollingRef.current = setInterval(async () => {
      pollingAttemptsRef.current += 1;
      const status = await fetchProfile();

      if (status === 'completed') {
        clearPolling();
        toast.success('Perfil criado! Agora você pode gerar fotos profissionais.');
        return;
      }

      if (status === 'failed') {
        clearPolling();
        toast.error('O treinamento falhou. Tente novamente.');
        return;
      }

      // Safety timeout to avoid endless loading
      if (pollingAttemptsRef.current >= 72) {
        clearPolling();
        toast.error('Treinamento demorou além do esperado. Atualize a página para sincronizar o status.');
      }
    }, 5000);
  }, [fetchProfile, clearPolling]);

  useEffect(() => () => clearPolling(), [clearPolling]);

  useEffect(() => {
    if (trainingStatus === 'uploading' || trainingStatus === 'training' || trainingStatus === 'generating_reference') {
      startPolling();
    } else {
      clearPolling();
    }
  }, [trainingStatus, startPolling, clearPolling]);

  const uploadAndTrain = useCallback(async (files: File[]) => {
    if (!user) return;
    if (files.length < 5 || files.length > 15) {
      toast.error('Envie entre 5 e 15 fotos para melhores resultados');
      return;
    }

    setIsLoading(true);
    setTrainingStatus('uploading');

    try {
      // 1. Create/update profile record
      const { data: newProfile, error: profileError } = await supabase
        .from('client_photo_profiles')
        .upsert(
          { user_id: user.id, training_status: 'uploading' },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Upload each photo and collect signed URLs
      const photoUrls: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${newProfile.id}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('studio-reference-photos')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: signedData } = await supabase.storage
          .from('studio-reference-photos')
          .createSignedUrl(path, 60 * 60);

        if (signedData?.signedUrl) photoUrls.push(signedData.signedUrl);
      }

      setTrainingStatus('training');
      setProfile({ ...newProfile, training_status: 'training' } as PhotoProfile);

      // 3. Call Edge Function (returns immediately)
      const { error } = await supabase.functions.invoke('studio-train-lora', {
        body: { photo_urls: photoUrls, profile_id: newProfile.id },
      });

      if (error) throw error;

      // 4. Keep polling for async completion
      startPolling();
    } catch (err: any) {
      setTrainingStatus('failed');
      toast.error(`Erro no treinamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, startPolling]);

  const generatePhotos = useCallback(async (scenario: string, quantity: 1 | 3 | 5) => {
    if (!profile?.id || trainingStatus !== 'completed') {
      toast.error('Complete o treinamento do perfil primeiro');
      return;
    }

    setIsGenerating(true);
    setGeneratedPhotos([]);

    try {
      const { data, error } = await supabase.functions.invoke('studio-generate-photos', {
        body: { scenario, quantity, profile_id: profile.id },
      });

      if (error) throw error;

      setGeneratedPhotos(data.photos);
      toast.success(`${quantity} foto${quantity > 1 ? 's' : ''} gerada${quantity > 1 ? 's' : ''} com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro na geração: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [profile, trainingStatus]);

  const resetGenerated = useCallback(() => setGeneratedPhotos([]), []);

  return {
    profile,
    isLoading,
    trainingStatus,
    generatedPhotos,
    isGenerating,
    uploadAndTrain,
    generatePhotos,
    resetGenerated,
  };
};

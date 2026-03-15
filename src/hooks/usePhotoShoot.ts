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

  const trainingPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTrainingPolling = useCallback(() => {
    if (trainingPollingRef.current) {
      clearInterval(trainingPollingRef.current);
      trainingPollingRef.current = null;
    }
  }, []);

  const clearGenerationPolling = useCallback(() => {
    if (generationPollingRef.current) {
      clearInterval(generationPollingRef.current);
      generationPollingRef.current = null;
    }
  }, []);

  // Fetch existing profile
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

    // Auto-heal stale generating_reference
    if (status === 'generating_reference' && data.lora_url) {
      const elapsed = Date.now() - new Date(data.updated_at).getTime();
      if (elapsed > 3 * 60 * 1000) {
        await supabase
          .from('client_photo_profiles')
          .update({ training_status: 'completed' })
          .eq('id', data.id);
        status = 'completed';
      }
    }

    setProfile({ ...data, training_status: status } as PhotoProfile);
    setTrainingStatus(status);
    return status;
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Training polling
  const startTrainingPolling = useCallback(() => {
    if (trainingPollingRef.current) return;
    let attempts = 0;
    trainingPollingRef.current = setInterval(async () => {
      attempts++;
      const status = await fetchProfile();
      if (status === 'completed') {
        clearTrainingPolling();
        toast.success('Perfil criado! Agora você pode gerar fotos profissionais.');
      } else if (status === 'failed') {
        clearTrainingPolling();
        toast.error('O treinamento falhou. Tente novamente.');
      } else if (attempts >= 72) {
        clearTrainingPolling();
        toast.error('Treinamento demorou além do esperado. Atualize a página.');
      }
    }, 5000);
  }, [fetchProfile, clearTrainingPolling]);

  useEffect(() => () => { clearTrainingPolling(); clearGenerationPolling(); }, [clearTrainingPolling, clearGenerationPolling]);

  useEffect(() => {
    if (['uploading', 'training', 'generating_reference'].includes(trainingStatus)) {
      startTrainingPolling();
    } else {
      clearTrainingPolling();
    }
  }, [trainingStatus, startTrainingPolling, clearTrainingPolling]);

  // Upload + train
  const uploadAndTrain = useCallback(async (files: File[]) => {
    if (!user) return;
    if (files.length < 5 || files.length > 15) {
      toast.error('Envie entre 5 e 15 fotos para melhores resultados');
      return;
    }

    setIsLoading(true);
    setTrainingStatus('uploading');

    try {
      const { data: newProfile, error: profileError } = await supabase
        .from('client_photo_profiles')
        .upsert(
          { user_id: user.id, training_status: 'uploading' },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();
      if (profileError) throw profileError;

      const photoUrls: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${newProfile.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('studio-reference-photos').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: signedData } = await supabase.storage.from('studio-reference-photos').createSignedUrl(path, 60 * 60);
        if (signedData?.signedUrl) photoUrls.push(signedData.signedUrl);
      }

      setTrainingStatus('training');
      setProfile({ ...newProfile, training_status: 'training' } as PhotoProfile);

      const { error } = await supabase.functions.invoke('studio-train-lora', {
        body: { photo_urls: photoUrls, profile_id: newProfile.id },
      });
      if (error) throw error;

      startTrainingPolling();
    } catch (err: any) {
      setTrainingStatus('failed');
      toast.error(`Erro no treinamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, startTrainingPolling]);

  // Generate photos (async with polling)
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

      const shootId = data.shoot_id;
      if (!shootId) throw new Error('Falha ao iniciar geração');

      // Poll photo_shoots table for completion
      let attempts = 0;
      clearGenerationPolling();

      generationPollingRef.current = setInterval(async () => {
        attempts++;

        const { data: shoot } = await supabase
          .from('photo_shoots')
          .select('status, generated_photo_paths, error_message')
          .eq('id', shootId)
          .single();

        if (!shoot) return;

        if (shoot.status === 'completed' && shoot.generated_photo_paths?.length) {
          clearGenerationPolling();

          // Get signed URLs for all generated photos
          const urls: string[] = [];
          for (const path of shoot.generated_photo_paths) {
            const { data: signed } = await supabase.storage
              .from('studio-generated-photos')
              .createSignedUrl(path, 60 * 60 * 24 * 7);
            if (signed?.signedUrl) urls.push(signed.signedUrl);
          }

          setGeneratedPhotos(urls);
          setIsGenerating(false);
          toast.success(`${urls.length} foto${urls.length > 1 ? 's' : ''} gerada${urls.length > 1 ? 's' : ''} com sucesso!`);
        } else if (shoot.status === 'failed') {
          clearGenerationPolling();
          setIsGenerating(false);
          toast.error(shoot.error_message || 'Erro na geração de fotos.');
        } else if (attempts >= 60) {
          clearGenerationPolling();
          setIsGenerating(false);
          toast.error('A geração demorou demais. Verifique em "Meus Ensaios".');
        }
      }, 5000);

    } catch (err: any) {
      setIsGenerating(false);
      toast.error(`Erro na geração: ${err.message}`);
    }
  }, [profile, trainingStatus, clearGenerationPolling]);

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

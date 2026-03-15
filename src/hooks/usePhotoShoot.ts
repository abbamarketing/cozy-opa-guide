import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

type TrainingStatus = 'idle' | 'uploading' | 'training' | 'generating_reference' | 'completed' | 'failed';

interface PhotoProfile {
  id: string;
  training_status: TrainingStatus;
  reference_image_url: string | null;
  lora_url: string | null;
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

  // Busca perfil existente do usuário
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_photo_profiles')
      .select('id, training_status, reference_image_url, lora_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setProfile(data as PhotoProfile);
      setTrainingStatus(data.training_status as TrainingStatus);
    }
  }, [user]);

  // Upload das fotos + dispara treinamento
  const uploadAndTrain = useCallback(async (files: File[]) => {
    if (!user) return;
    if (files.length < 5 || files.length > 15) {
      toast.error('Envie entre 5 e 15 fotos para melhores resultados');
      return;
    }

    setIsLoading(true);
    setTrainingStatus('uploading');

    try {
      // 1. Cria registro do perfil
      const { data: newProfile, error: profileError } = await supabase
        .from('client_photo_profiles')
        .upsert(
          { user_id: user.id, training_status: 'uploading' },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Faz upload de cada foto e coleta URLs temporárias
      const photoUrls: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${newProfile.id}/${Date.now()}_${file.name}`;
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

      // 3. Chama Edge Function de treinamento
      const { data, error } = await supabase.functions.invoke('studio-train-lora', {
        body: { photo_urls: photoUrls, profile_id: newProfile.id },
      });

      if (error) throw error;

      // 4. Atualiza estado local
      const updatedProfile: PhotoProfile = {
        id: newProfile.id,
        training_status: 'completed',
        reference_image_url: data.reference_image_url,
        lora_url: data.lora_url,
      };
      setProfile(updatedProfile);
      setTrainingStatus('completed');
      toast.success('Perfil criado! Agora você pode gerar fotos profissionais.');

    } catch (err: any) {
      setTrainingStatus('failed');
      toast.error(`Erro no treinamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Gera fotos para um cenário
  const generatePhotos = useCallback(async (scenario: string, quantity: 1 | 3 | 5) => {
    if (!profile?.id || profile.training_status !== 'completed') {
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
  }, [profile]);

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

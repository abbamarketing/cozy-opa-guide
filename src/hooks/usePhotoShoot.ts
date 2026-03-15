import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-analyze-photos`;
const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-generate-photos`;

export type Scenario = 'studio' | 'clinic' | 'office' | 'outdoor';
export type Quantity = 1 | 3 | 5;

export interface PhotoShootResult {
  shoot_id: string;
  photos: string[];
  credits_used: number;
  credits_remaining: number;
}

export interface ClientProfile {
  id: string;
  person_summary: string;
  overall_confidence: number;
  photos_used: number;
}

export function usePhotoShoot() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState('');
  const [existingProfile, setExistingProfile] = useState<ClientProfile | null>(null);
  const [result, setResult] = useState<PhotoShootResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkExistingProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_photo_profiles')
      .select('id, profile_document, photos_analyzed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const doc = data.profile_document as Record<string, unknown> | null;
      setExistingProfile({
        id: data.id,
        person_summary: (doc?.person_summary as string) || 'Perfil salvo',
        overall_confidence: (doc?.overall_confidence as number) || 0,
        photos_used: data.photos_analyzed,
      });
    }
  }, [user]);

  const uploadReferencePhotos = useCallback(async (files: File[]): Promise<string[]> => {
    if (!user) throw new Error('Usuário não autenticado');
    const paths: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${user.id}/references/${fileName}`;
      const { error } = await supabase.storage
        .from('studio-reference-photos')
        .upload(filePath, file, { upsert: false });
      if (error) throw error;
      paths.push(filePath);
    }
    return paths;
  }, [user]);

  const analyzePhotos = useCallback(async (files: File[]) => {
    if (!user) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      setAnalyzeProgress('Enviando fotos...');
      const paths = await uploadReferencePhotos(files);

      setAnalyzeProgress('Identificando características...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const resp = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photo_paths: paths }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 429) throw new Error('Limite de requisições. Tente novamente em breve.');
        if (resp.status === 402) throw new Error('Créditos da plataforma esgotados.');
        throw new Error(err.error || 'Erro na análise');
      }

      const data = await resp.json();
      setExistingProfile({
        id: data.profile_id,
        person_summary: data.summary,
        overall_confidence: data.overall_confidence,
        photos_used: data.photos_used,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar fotos');
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress('');
    }
  }, [user, uploadReferencePhotos]);

  const generatePhotos = useCallback(async (scenario: Scenario, quantity: Quantity) => {
    if (!user) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ scenario, quantity }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 402) throw new Error('Créditos insuficientes');
        if (resp.status === 404) throw new Error('Perfil não encontrado. Analise suas fotos primeiro.');
        if (resp.status === 429) throw new Error('Limite de requisições. Tente novamente em breve.');
        throw new Error(err.error || 'Erro na geração');
      }

      const data: PhotoShootResult = await resp.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar fotos');
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    isGenerating,
    analyzeProgress,
    existingProfile,
    result,
    error,
    checkExistingProfile,
    analyzePhotos,
    generatePhotos,
    reset,
  };
}

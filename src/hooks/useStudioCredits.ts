import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface StudioCredits {
  available: number;
  used: number;
  periodEnd: string;
}

export const useStudioCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<StudioCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('studio_credits')
      .select('credits_available, credits_used, period_end')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    setCredits(data ? {
      available: data.credits_available,
      used: data.credits_used,
      periodEnd: data.period_end,
    } : { available: 10, used: 0, periodEnd: '' });

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, isLoading, refetch: fetchCredits };
};

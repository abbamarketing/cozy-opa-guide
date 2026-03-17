import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  company: string | null;
  onboarding_complete: boolean;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { roles, loading: roleLoading, isGod, isAdmin, isEditor } = useRole();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      return data ? (data as unknown as Profile) : null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const primaryRole = isGod()
    ? 'god'
    : isAdmin()
    ? 'admin'
    : isEditor()
    ? 'editor'
    : 'client';

  return { profile: profile ?? null, roles, primaryRole, isLoading: profileLoading || roleLoading };
};

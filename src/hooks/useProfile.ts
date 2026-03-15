import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  company: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user!.id),
      ]);

      const profile = profileRes.data ? (profileRes.data as unknown as Profile) : null;
      const roles = rolesRes.data ? rolesRes.data.map((r) => r.role) : [];

      return { profile, roles };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const profile = data?.profile ?? null;
  const roles = data?.roles ?? [];

  const primaryRole = roles.includes('god')
    ? 'god'
    : roles.includes('admin')
    ? 'admin'
    : roles.includes('editor')
    ? 'editor'
    : 'client';

  return { profile, roles, primaryRole, isLoading };
};

import { useEffect, useState } from 'react';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as Profile);
      }
      if (rolesRes.data) {
        setRoles(rolesRes.data.map((r) => r.role));
      }
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const primaryRole = roles.includes('admin')
    ? 'admin'
    : roles.includes('editor')
    ? 'editor'
    : 'client';

  return { profile, roles, primaryRole, isLoading };
};

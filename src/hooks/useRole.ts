import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type AppRole = 'admin' | 'editor' | 'client' | 'god';

export function useRole() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isAuthLoading) return;

    if (!user?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (!error && data) {
        setRoles(data.map(r => r.role as AppRole));
      }
      setLoading(false);
    };

    fetchRoles();
    return () => { cancelled = true; };
  }, [user?.id, isAuthLoading]);

  const isGod = () => roles.includes('god');
  const hasRole = (role: AppRole) => roles.includes(role) || roles.includes('god');
  const isAdmin = () => hasRole('admin');
  const isEditor = () => hasRole('editor');
  const isClient = () => hasRole('client');

  return { roles, loading, hasRole, isAdmin, isEditor, isClient, isGod };
}

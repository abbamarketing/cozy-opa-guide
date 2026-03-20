import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface TeamPermissions {
  admin_tabs: string[];
  can_create_delivery: boolean;
  can_edit_delivery: boolean;
  can_delete_delivery: boolean;
  can_manage_clients: boolean;
  can_manage_editors: boolean;
  can_view_financials: boolean;
  can_manage_projects: boolean;
  can_export_data: boolean;
}

const DEFAULT_PERMISSIONS: TeamPermissions = {
  admin_tabs: ['overview'],
  can_create_delivery: false,
  can_edit_delivery: false,
  can_delete_delivery: false,
  can_manage_clients: false,
  can_manage_editors: false,
  can_view_financials: false,
  can_manage_projects: false,
  can_export_data: false,
};

export function useTeamPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<TeamPermissions | null>(null);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetch = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- team_members is not in generated types
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data && !error) {
        setPermissions({ ...DEFAULT_PERMISSIONS, ...(data.permissions as object) } as TeamPermissions);
        setDisplayRole(data.display_role);
        setIsTeamMember(true);
      } else {
        setPermissions(null);
        setDisplayRole(null);
        setIsTeamMember(false);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const hasTab = (tab: string) => {
    if (!isTeamMember || !permissions) return true; // non-team-members (god) see everything
    return permissions.admin_tabs.includes(tab);
  };

  const can = (action: keyof Omit<TeamPermissions, 'admin_tabs'>) => {
    if (!isTeamMember || !permissions) return true;
    return permissions[action];
  };

  return { permissions, displayRole, isTeamMember, loading, hasTab, can };
}

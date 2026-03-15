import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';

export interface UserProjectData {
  id: string;
  user_id: string;
  status: string;
  client_type: string | null;
  subscription_tier: string | null;
  sla_hours: number | null;
  studio_access: boolean | null;
  youtube_reserved: number;
  youtube_approved: number;
  instagram_reserved: number;
  instagram_approved: number;
  thumbnails_reserved: number;
  thumbnails_approved: number;
  covers_reserved: number;
  covers_approved: number;
  captures_reserved: number;
  captures_approved: number;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id: string | null;
  tour_completed: boolean;
  custom_project: {
    id: string;
    project_name: string;
    description: string | null;
    youtube_videos: number;
    instagram_videos: number;
    include_thumbnails: boolean;
    include_covers: boolean;
    include_script: boolean;
    include_capture: boolean;
    max_captures: number;
    monthly_value: number;
    payment_frequency: string;
    max_revisions: number;
    deadline: string;
    capture_lead_days: number;
  } | null;
  subscription_slug?: string | null;
  custom_slug?: string | null;
  monthly_quota?: number | null;
  script_credits?: number | null;
}

const GOD_MOCK_PROJECT: Omit<UserProjectData, 'user_id'> = {
  id: 'god-mode',
  status: 'active',
  client_type: 'god',
  subscription_tier: null,
  sla_hours: null,
  studio_access: true,
  youtube_reserved: 0,
  youtube_approved: 0,
  instagram_reserved: 0,
  instagram_approved: 0,
  thumbnails_reserved: 0,
  thumbnails_approved: 0,
  covers_reserved: 0,
  covers_approved: 0,
  captures_reserved: 0,
  captures_approved: 0,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  stripe_subscription_id: null,
  tour_completed: true,
  custom_project: null,
  subscription_slug: null,
  custom_slug: null,
  monthly_quota: 999,
  script_credits: 999,
};

export const useUserProject = () => {
  const { user } = useAuth();
  const { isGod, loading: roleLoading } = useRole();

  const isGodUser = isGod();

  const { data: userProject = null, isLoading, error } = useQuery({
    queryKey: ['user-project', user?.id, isGodUser],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('user_projects')
        .select('*, custom_project:custom_projects(*)')
        .eq('user_id', user!.id)
        .in('status', ['active', 'pending_payment'])
        .maybeSingle();

      if (err) throw new Error(err.message);

      if (data) return data as unknown as UserProjectData;

      if (isGodUser) {
        return { ...GOD_MOCK_PROJECT, user_id: user!.id } as UserProjectData;
      }

      return null;
    },
    enabled: !!user?.id && !roleLoading,
    staleTime: 5 * 60 * 1000,
  });

  return { userProject, isLoading: isLoading || roleLoading, error: error?.message ?? null };
};

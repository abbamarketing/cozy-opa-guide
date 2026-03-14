import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface UserProjectData {
  id: string;
  user_id: string;
  status: string;
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
  };
}

export const useUserProject = () => {
  const { user } = useAuth();

  const { data: userProject = null, isLoading, error } = useQuery({
    queryKey: ['user-project', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('user_projects')
        .select('*, custom_project:custom_projects(*)')
        .eq('user_id', user!.id)
        .in('status', ['active', 'pending_payment'])
        .maybeSingle();

      if (err) throw new Error(err.message);
      return (data as unknown as UserProjectData) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return { userProject, isLoading, error: error?.message ?? null };
};

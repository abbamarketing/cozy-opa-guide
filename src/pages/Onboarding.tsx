import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUserProject } from '@/hooks/useUserProject';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import BriefingForm from '@/components/onboarding/BriefingForm';
import ClientGuard from '@/components/layout/ClientGuard';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { userProject, isLoading } = useUserProject();

  const handleBriefingComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('user_id', user.id);

      // Invalidate profile cache so ClientGuard reads the updated value
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    logger.info('Onboarding concluído', {}, 'onboarding');
    navigate('/dashboard', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ClientGuard requireStep="onboarding">
      <BriefingForm onComplete={handleBriefingComplete} />
    </ClientGuard>
  );
}

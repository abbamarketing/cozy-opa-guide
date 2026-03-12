import { Navigate, useNavigate } from 'react-router-dom';
import { useUserProject } from '@/hooks/useUserProject';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import BriefingForm from '@/components/onboarding/BriefingForm';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProject, isLoading } = useUserProject();

  const handleBriefingComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('user_id', user.id);
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

  if (!userProject?.custom_project) {
    return <Navigate to="/" replace />;
  }

  return <BriefingForm onComplete={handleBriefingComplete} />;
}

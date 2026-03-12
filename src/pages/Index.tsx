import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, primaryRole, isLoading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  switch (primaryRole) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'editor':
      return <Navigate to="/editor" replace />;
    default:
      return <Navigate to={profile?.onboarding_complete ? '/dashboard' : '/onboarding'} replace />;
  }
};

export default Index;

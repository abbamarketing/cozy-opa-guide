import { Navigate } from 'react-router-dom';
import { useUserProject } from '@/hooks/useUserProject';
import { useProfile } from '@/hooks/useProfile';
// REMOVIDO em PRD v5 — useRole não é mais necessário para bypass admin
import { Loader2 } from 'lucide-react';

interface ClientGuardProps {
  children: React.ReactNode;
  /** Which step this guard protects */
  requireStep: 'payment' | 'onboarding' | 'dashboard';
}

/**
 * Enforces the client journey order: Waiting → Payment → Onboarding → Dashboard.
 * REMOVIDO em PRD v5 — admin não bypassa mais a jornada do cliente.
 */
export default function ClientGuard({ children, requireStep }: ClientGuardProps) {
  const { userProject, isLoading: projectLoading } = useUserProject();
  const { profile, isLoading: profileLoading } = useProfile();
  const { hasRole, loading: roleLoading } = useRole();

  if (projectLoading || profileLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // REMOVIDO em PRD v5 — admin não bypassa payment gate nem jornada do cliente

  // No project at all → waiting
  if (!userProject) {
    return requireStep === 'payment' ? <>{children}</> : <Navigate to="/waiting" replace />;
  }

  const isPendingPayment = userProject.status === 'pending_payment';
  const isActive = userProject.status === 'active';
  const onboardingDone = profile?.onboarding_complete ?? false;

  switch (requireStep) {
    case 'payment':
      if (isActive) {
        return onboardingDone
          ? <Navigate to="/dashboard" replace />
          : <Navigate to="/onboarding" replace />;
      }
      return <>{children}</>;

    case 'onboarding':
      if (isPendingPayment) {
        return <Navigate to="/payment" replace />;
      }
      if (onboardingDone) {
        return <Navigate to="/dashboard" replace />;
      }
      return <>{children}</>;

    case 'dashboard':
      if (isPendingPayment) {
        return <Navigate to="/payment" replace />;
      }
      if (!onboardingDone) {
        return <Navigate to="/onboarding" replace />;
      }
      return <>{children}</>;

    default:
      return <>{children}</>;
  }
}

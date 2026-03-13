import { Navigate } from 'react-router-dom';
import { useUserProject } from '@/hooks/useUserProject';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface ClientGuardProps {
  children: React.ReactNode;
  /** Which step this guard protects */
  requireStep: 'payment' | 'onboarding' | 'dashboard';
}

/**
 * Enforces the client journey order: Waiting → Payment → Onboarding → Dashboard.
 * Wraps client pages to prevent skipping steps via direct URL navigation.
 */
export default function ClientGuard({ children, requireStep }: ClientGuardProps) {
  const { userProject, isLoading: projectLoading } = useUserProject();
  const { profile, isLoading: profileLoading } = useProfile();

  if (projectLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No project at all → waiting
  if (!userProject) {
    return requireStep === 'payment' ? <>{children}</> : <Navigate to="/waiting" replace />;
  }

  const isPendingPayment = userProject.status === 'pending_payment';
  const isActive = userProject.status === 'active';
  const onboardingDone = profile?.onboarding_complete ?? false;

  switch (requireStep) {
    case 'payment':
      // If already paid, skip payment page
      if (isActive) {
        return onboardingDone
          ? <Navigate to="/dashboard" replace />
          : <Navigate to="/onboarding" replace />;
      }
      return <>{children}</>;

    case 'onboarding':
      // Must pay first
      if (isPendingPayment) {
        return <Navigate to="/payment" replace />;
      }
      // If onboarding already done, go to dashboard
      if (onboardingDone) {
        return <Navigate to="/dashboard" replace />;
      }
      return <>{children}</>;

    case 'dashboard':
      // Must pay first
      if (isPendingPayment) {
        return <Navigate to="/payment" replace />;
      }
      // Must complete onboarding first
      if (!onboardingDone) {
        return <Navigate to="/onboarding" replace />;
      }
      return <>{children}</>;

    default:
      return <>{children}</>;
  }
}

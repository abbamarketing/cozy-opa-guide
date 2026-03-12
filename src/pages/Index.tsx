import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import WaitingForProject from '@/components/shared/WaitingForProject';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, primaryRole, isLoading: profileLoading } = useProfile();
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [checkingProject, setCheckingProject] = useState(false);
  const [assignedProjectId, setAssignedProjectId] = useState<string | null | undefined>(undefined);

  const checkProjectStatus = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('assigned_project_id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) return;

    setAssignedProjectId((data as any).assigned_project_id);

    if ((data as any).assigned_project_id) {
      // Fetch user_project status
      const { data: up } = await supabase
        .from('user_projects')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      setProjectStatus(up?.status || null);
    }
    setCheckingProject(false);
  }, [user]);

  // Initial check for client role
  useEffect(() => {
    if (profileLoading || authLoading || !user || !profile) return;
    if (primaryRole === 'client') {
      setCheckingProject(true);
      checkProjectStatus();
    }
  }, [profileLoading, authLoading, user, profile, primaryRole, checkProjectStatus]);

  // Polling for clients without project
  useEffect(() => {
    if (primaryRole !== 'client' || assignedProjectId !== null || assignedProjectId === undefined) return;

    const interval = setInterval(() => {
      checkProjectStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [primaryRole, assignedProjectId, checkProjectStatus]);

  // Loading states
  if (authLoading || profileLoading || checkingProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based routing
  switch (primaryRole) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'editor':
      return <Navigate to="/editor" replace />;
    default: {
      // Client flow
      if (assignedProjectId === null) {
        return <WaitingForProject />;
      }

      if (!profile?.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
      }

      if (projectStatus === 'pending_payment') {
        return <Navigate to="/onboarding/payment" replace />;
      }

      return <Navigate to="/dashboard" replace />;
    }
  }
};

export default Index;

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, Shield, Film, User, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';


const ROLE_CONFIG: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }>; path: string }> = {
  admin: { label: 'Administrador', description: 'Gerencie projetos, clientes e editores', icon: Shield, path: '/admin' },
  editor: { label: 'Editor', description: 'Veja e gerencie suas entregas', icon: Film, path: '/editor' },
  client: { label: 'Cliente', description: 'Acompanhe suas entregas e projetos', icon: User, path: '/dashboard' },
};

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, roles, primaryRole, isLoading: profileLoading } = useProfile();
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [clientType, setClientType] = useState<string | null>(null);
  const [checkingProject, setCheckingProject] = useState(false);
  const [assignedProjectId, setAssignedProjectId] = useState<string | null | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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
      const { data: up } = await supabase
        .from('user_projects')
        .select('status, client_type')
        .eq('user_id', user.id)
        .maybeSingle();

      setProjectStatus(up?.status || null);
      setClientType((up as any)?.client_type || null);
    }
    setCheckingProject(false);
  }, [user]);

  // Initial check for client role
  useEffect(() => {
    if (profileLoading || authLoading || !user || !profile) return;
    if (roles.includes('client')) {
      setCheckingProject(true);
      checkProjectStatus();
    }
  }, [profileLoading, authLoading, user, profile, roles, checkProjectStatus]);

  // Realtime subscription for clients without project
  useEffect(() => {
    if (!user || !roles.includes('client') || assignedProjectId !== null || assignedProjectId === undefined) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, () => { checkProjectStatus(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, roles, assignedProjectId, checkProjectStatus]);

  // Loading states
  if (authLoading || profileLoading || checkingProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  // If user has only one role, redirect directly
  if (roles.length <= 1) {
    return handleSingleRoleRedirect(primaryRole, assignedProjectId, profile, projectStatus, clientType);
  }

  // If user selected a role, redirect
  if (selectedRole) {
    if (selectedRole === 'client') {
      return handleSingleRoleRedirect('client', assignedProjectId, profile, projectStatus);
    }
    const config = ROLE_CONFIG[selectedRole];
    if (config) return <Navigate to={config.path} replace />;
  }

  // Multiple roles → show selector
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-neon flex items-center justify-center">
          <Play className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">
          Abba<span className="text-primary">Video</span>
        </span>
      </div>

      <h1 className="mb-2 text-xl font-semibold text-foreground">Olá, {profile?.full_name || 'usuário'}!</h1>
      <p className="mb-8 text-sm text-muted-foreground">Escolha como deseja acessar a plataforma:</p>

      <div className="grid w-full max-w-md gap-3">
        {roles.map((role) => {
          const config = ROLE_CONFIG[role];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <Card
              key={role}
              onClick={() => setSelectedRole(role)}
              className="cursor-pointer border-border/40 bg-card/80 p-5 transition-all hover:border-primary/50 hover:bg-card hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

function handleSingleRoleRedirect(
  role: string,
  assignedProjectId: string | null | undefined,
  profile: { onboarding_complete: boolean } | null,
  projectStatus: string | null,
  clientType: string | null,
) {
  switch (role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'editor':
      return <Navigate to="/editor" replace />;
    default: {
      if (assignedProjectId === null) {
        return <Navigate to="/waiting" replace />;
      }
      // Payment FIRST, then onboarding
      if (projectStatus === 'pending_payment') {
        return <Navigate to="/payment" replace />;
      }
      // Route based on client_type
      if (clientType === 'studio') {
        return <Navigate to="/studio" replace />;
      }
      if (clientType === 'subscription') {
        if (!profile?.onboarding_complete) {
          return <Navigate to="/onboarding" replace />;
        }
        return <Navigate to="/dashboard" replace />;
      }
      // Default (custom) — existing flow
      if (!profile?.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }
}

export default Index;

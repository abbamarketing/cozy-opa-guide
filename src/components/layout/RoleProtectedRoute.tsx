import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'editor' | 'client';

interface RoleProtectedRouteProps {
  allowedRoles: AppRole[];
  redirectTo?: string;
}

const RoleProtectedRoute = ({ allowedRoles, redirectTo = '/dashboard' }: RoleProtectedRouteProps) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { roles, loading: isRoleLoading } = useRole();

  if (isAuthLoading || isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasAccess = roles.some(role => allowedRoles.includes(role));
  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;

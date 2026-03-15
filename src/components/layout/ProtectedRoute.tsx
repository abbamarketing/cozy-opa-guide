import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useRole } from '@/hooks/useRole'
import { Loader2 } from 'lucide-react'

type ProtectedRouteProps = {
  requireRole?: 'admin' | 'editor' | 'client'
}

export default function ProtectedRoute({ requireRole }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { hasRole, isGod, loading: roleLoading } = useRole()

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // God users skip role checks but still require authentication (checked above)

  if (requireRole && !isGod() && !hasRole(requireRole) && !hasRole('admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="bg-abba-surface p-8 rounded-[20px] max-w-md text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Acesso Negado
          </h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta área.
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-primary hover:underline"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}

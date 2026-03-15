import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import abbaLogo from '@/assets/abba-logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const AuthPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result?.error) {
        toast.error('Erro ao entrar com Google', {
          description: (result.error as Error).message || 'Tente novamente.',
        });
      }
    } catch (err: any) {
      toast.error('Erro ao entrar', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="h-12 w-12 rounded-xl gradient-neon flex items-center justify-center neon-glow">
            <Play className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-2xl font-bold">
              Abba<span className="text-primary">Video</span>
            </span>
            <span className="font-mono-code text-xs text-muted-foreground ml-1.5">v1.0</span>
          </div>
        </motion.div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-border/50 text-center space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-1">Bem-vindo</h1>
            <p className="text-sm text-muted-foreground">
              Faça login com sua conta Google para acessar a plataforma.
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full gap-3 h-12 text-sm"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {loading ? 'Conectando...' : 'Entrar com Google'}
          </Button>

          <p className="text-[10px] text-muted-foreground">
            Ao entrar, você concorda com nossos{' '}
            <a href="/terms" className="underline hover:text-foreground transition-colors">termos de uso</a>{' '}
            e{' '}
            <a href="/privacy" className="underline hover:text-foreground transition-colors">política de privacidade</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;

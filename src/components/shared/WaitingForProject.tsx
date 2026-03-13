import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageCircle, Loader2, CheckCircle, LogOut, Shield, Film, User } from 'lucide-react';

const WHATSAPP_NUMBER = '5511999117106';
const WHATSAPP_MESSAGE = encodeURIComponent(
  'Olá! Gostaria de solicitar a liberação do meu projeto na plataforma AbbaVideo.',
);

export default function WaitingForProject() {
  const { user, signOut } = useAuth();
  const { roles, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  const roleDisplay = roles.includes('admin')
    ? { label: 'Administrador', icon: Shield, variant: 'default' as const }
    : roles.includes('editor')
    ? { label: 'Editor', icon: Film, variant: 'secondary' as const }
    : { label: 'Cliente', icon: User, variant: 'outline' as const };

  useEffect(() => {
    if (!user) return;

    const checkProject = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('assigned_project_id')
        .eq('user_id', user.id)
        .single();

      if (data?.assigned_project_id) {
        navigate('/onboarding');
      }
    }, 10000);

    return () => clearInterval(checkProject);
  }, [user, navigate]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Animated icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary"
            style={{ animationDuration: '2s' }}
          />
          <Clock className="h-8 w-8 text-primary" />
        </div>

        {/* User role indicator */}
        {!roleLoading && (
          <div className="flex justify-center">
            <Badge variant={roleDisplay.variant} className="gap-1.5 px-3 py-1 text-xs">
              <roleDisplay.icon className="h-3 w-3" />
              {roleDisplay.label}
            </Badge>
          </div>
        )}

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-mono text-2xl font-bold text-foreground">
            Personalizando seu projeto{dots}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Seu projeto está sendo personalizado para você. Por favor, conclua o login ou aguarde a
            liberação.
          </p>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3 text-left">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground/90">Conta criada com sucesso</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span className="text-muted-foreground">Projeto sendo configurado pela equipe</span>
          </div>
        </div>

        {/* Auto-check indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-mono uppercase tracking-wider">Verificando automaticamente</span>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-2">
          <Button
            asChild
            className="w-full gap-2"
            size="lg"
          >
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5" />
              Solicitar Liberação
            </a>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>

        {/* Footer */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
          AbbaVideo
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Mail, Phone, MessageCircle, Play, CheckCircle, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatWaitTime = (minutes: number) => {
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hora${hours !== 1 ? 's' : ''}`;
};

export default function WaitingForProject() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [timeWaiting, setTimeWaiting] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Polling every 10 seconds
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

    // Timer - increment every minute
    const timer = setInterval(() => {
      setTimeWaiting((prev) => prev + 1);
    }, 60000);

    return () => {
      clearInterval(checkProject);
      clearInterval(timer);
    };
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-xl gradient-neon flex items-center justify-center animate-glow">
            <Play className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">
            Video<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Main Card */}
        <div className="glass rounded-2xl p-8 space-y-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Configurando seu Projeto...</h1>
            <p className="text-muted-foreground leading-relaxed">
              Nossa equipe está preparando tudo para você começar!
            </p>
          </div>

          {timeWaiting > 0 && (
            <p className="text-sm text-muted-foreground">
              Tempo esperando: <span className="text-foreground font-medium">{formatWaitTime(timeWaiting)}</span>
            </p>
          )}

          {/* Progress Steps */}
          <div className="space-y-3 text-left">
            <h3 className="text-sm font-semibold text-card-foreground">O que está acontecendo agora:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-card-foreground">Sua conta foi criada com sucesso</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <span className="text-muted-foreground">Nosso time está criando seu projeto personalizado</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Verificando status automaticamente...
          </div>
        </div>

        {/* Contact Card */}
        <Card className="glass border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-card-foreground text-center">Precisa de ajuda?</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground">Email</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground">WhatsApp</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground">Telefone</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Tempo médio de resposta: 2 horas úteis
            </p>
          </CardContent>
        </Card>

        {/* Tip Card */}
        <Card className="glass border-border/40">
          <CardContent className="pt-5 flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-card-foreground">Dica:</span> Enquanto aguarda, você pode já pensar nos vídeos que quer criar, reunir suas referências visuais e preparar seu material bruto!
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
}

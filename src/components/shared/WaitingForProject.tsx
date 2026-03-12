import { Play, Clock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const WaitingForProject = () => {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl gradient-neon flex items-center justify-center animate-glow">
            <Play className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">
            Video<span className="text-primary">Flow</span>
          </span>
        </div>

        <div className="glass rounded-2xl p-10 space-y-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary animate-pulse-neon" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Configurando seu projeto...</h1>
            <p className="text-muted-foreground leading-relaxed">
              Nossa equipe está preparando seu projeto personalizado. 
              Você receberá um email assim que estiver pronto para começar!
            </p>
          </div>

          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground text-left">
              Tempo médio: <span className="text-foreground font-medium">24 horas</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-neon" />
            Verificando status automaticamente...
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={signOut} className="mt-6 text-muted-foreground">
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default WaitingForProject;

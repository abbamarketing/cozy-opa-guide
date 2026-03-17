import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Lock, Loader2, CheckCircle2, Shield, Zap, Clock } from 'lucide-react';
import { useUserProject } from '@/hooks/useUserProject';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClientGuard from '@/components/layout/ClientGuard';

export default function PaymentGate() {
  const navigate = useNavigate();
  const { userProject, isLoading } = useUserProject();
  const [creating, setCreating] = useState(false);

  const handlePayment = async () => {
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      if (data?.url) window.location.href = data.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em alguns instantes';
      toast.error('Erro ao processar pagamento', { description: message });
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Projeto não encontrado</p>
      </div>
    );
  }

  const project = userProject.custom_project;
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando projeto...</p>
      </div>
    );
  }

  const frequencyLabel =
    project.payment_frequency === 'monthly'
      ? 'mensalmente'
      : project.payment_frequency === 'quarterly'
      ? 'trimestralmente'
      : 'anualmente';

  const features = [
    project.youtube_videos > 0 && `${project.youtube_videos} vídeos YouTube/mês`,
    project.instagram_videos > 0 && `${project.instagram_videos} vídeos Instagram/mês`,
    project.include_thumbnails && 'Thumbnails personalizadas',
    project.include_covers && 'Capas Instagram',
    
    project.include_capture && 'Captação de vídeo',
    `Até ${project.max_revisions} revisões por entrega`,
    `Entrega em ${project.deadline}`,
  ].filter(Boolean) as string[];

  return (
    <ClientGuard requireStep="payment">
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border/30 px-4 py-4">
          <div className="mx-auto flex max-w-5xl items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              disabled={creating}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <span className="ml-auto font-mono text-xs uppercase tracking-widest text-muted-foreground">
              AbbaVideo
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="mx-auto w-full max-w-4xl">
            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Finalizar assinatura
              </h1>
              <p className="mt-2 text-muted-foreground">
                Revise os detalhes do seu projeto e prossiga com o pagamento seguro.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-5">
              {/* Plan details – 3 cols */}
              <div className="space-y-5 md:col-span-3">
                {/* Project card */}
                <div className="rounded-xl border border-border/40 bg-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Projeto
                      </p>
                      <h2 className="text-lg font-bold text-foreground">{project.project_name}</h2>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {features.map((feat, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground/90">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Shield, label: 'Pagamento seguro' },
                    { icon: Lock, label: 'Dados criptografados' },
                    { icon: Clock, label: 'Cancele quando quiser' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border/30 bg-card/50 p-3 text-center"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment CTA – 2 cols */}
              <div className="md:col-span-2">
                <div className="sticky top-8 rounded-xl border border-primary/20 bg-card p-6">
                  <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Investimento
                  </p>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary">
                      R${' '}
                      {Number(project.monthly_value).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="mb-6 text-xs text-muted-foreground">
                    Cobrado {frequencyLabel} via Stripe
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={handlePayment}
                      disabled={creating}
                      className="w-full"
                      size="lg"
                    >
                      {creating ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-5 w-5" />
                      )}
                      {creating ? 'Processando...' : 'Ir para pagamento'}
                    </Button>

                    <p className="text-center text-[10px] text-muted-foreground">
                      Você será redirecionado para a página segura do Stripe.
                    </p>
                  </div>

                  <div className="mt-6 rounded-lg bg-muted/15 p-3">
                    <div className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                      <p className="text-xs text-muted-foreground">
                        Seus dados de cartão são criptografados e nunca passam pelos nossos servidores.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ClientGuard>
  );
}

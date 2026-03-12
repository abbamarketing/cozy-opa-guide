import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Lock, Loader2 } from 'lucide-react';
import { useUserProject } from '@/hooks/useUserProject';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PaymentGate() {
  const navigate = useNavigate();
  const { userProject, isLoading } = useUserProject();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userProject?.status === 'active') {
      navigate('/dashboard');
    }
  }, [userProject, navigate]);

  const handlePayment = async () => {
    setCreating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

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

      if (data?.url) {
        window.location.href = data.url;
      }
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Resumo do Projeto */}
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">Seu Projeto</CardTitle>
              <CardDescription className="text-lg font-semibold text-foreground">
                {project.project_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-3 font-semibold">O que está incluído:</h3>
                <ul className="space-y-2 text-sm">
                  {project.youtube_videos > 0 && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {project.youtube_videos} vídeos YouTube/mês
                    </li>
                  )}
                  {project.instagram_videos > 0 && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {project.instagram_videos} vídeos Instagram/mês
                    </li>
                  )}
                  {project.include_thumbnails && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Thumbnails personalizadas
                    </li>
                  )}
                  {project.include_covers && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Capas Instagram
                    </li>
                  )}
                  {project.include_script && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Roteiros com IA
                    </li>
                  )}
                  {project.include_capture && (
                    <li className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Captação de vídeo
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                     <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Até {project.max_revisions} revisões por entrega
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Entrega em {project.deadline}
                  </li>
                </ul>
              </div>

              <div className="border-t border-border/50 pt-4">
                <h3 className="mb-2 font-semibold">💰 Investimento</h3>
                <div className="text-3xl font-bold text-primary">
                  R$ {Number(project.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cobrado{' '}
                  {project.payment_frequency === 'monthly'
                    ? 'mensalmente'
                    : project.payment_frequency === 'quarterly'
                    ? 'trimestralmente'
                    : 'anualmente'}{' '}
                  via Stripe
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ação */}
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle>Pronto para começar?</CardTitle>
              <CardDescription>
                Ao clicar em continuar você será redirecionado para a página segura de pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg bg-muted/20 p-4">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="mb-1 font-semibold">Pagamento 100% seguro</p>
                  <p className="text-muted-foreground">
                    Processado via Stripe, a plataforma de pagamentos mais segura do mundo. Seus dados
                    de cartão são criptografados e nunca passam pelos nossos servidores.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={handlePayment} disabled={creating} className="w-full" size="lg">
                  {creating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {creating ? 'Processando...' : 'Ir para Pagamento'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full"
                  disabled={creating}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
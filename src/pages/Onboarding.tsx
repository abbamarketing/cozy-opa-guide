import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProject } from '@/hooks/useUserProject';
import BriefingForm from '@/components/onboarding/BriefingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { userProject, isLoading } = useUserProject();
  const [step, setStep] = useState<'briefing' | 'summary'>('briefing');

  const handleBriefingComplete = () => {
    setStep('summary');
  };

  const handleGoToPayment = () => {
    navigate('/onboarding/payment');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando projeto...</div>
      </div>
    );
  }

  if (!userProject?.custom_project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Nenhum projeto encontrado.</div>
      </div>
    );
  }

  const project = userProject.custom_project;

  if (step === 'briefing') {
    return <BriefingForm onComplete={handleBriefingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Briefing Completo</span>
            </div>
            <CardTitle className="text-3xl">Tudo Pronto!</CardTitle>
            <CardDescription className="text-base">
              Revise seu projeto antes de finalizar o pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">📦 Seu Projeto: {project.project_name}</h3>
              <div className="grid gap-3">
                {project.youtube_videos > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>{project.youtube_videos} vídeos YouTube por mês</span>
                  </div>
                )}
                {project.instagram_videos > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>{project.instagram_videos} vídeos Instagram por mês</span>
                  </div>
                )}
                {project.include_thumbnails && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>Thumbnails personalizadas</span>
                  </div>
                )}
                {project.include_covers && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>Capas para Instagram</span>
                  </div>
                )}
                {project.include_script && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>Roteiros gerados por IA</span>
                  </div>
                )}
                {project.include_capture && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✅</span>
                    <span>Captação de vídeo</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-primary">✅</span>
                  <span>Até {project.max_revisions} revisões por entrega</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-primary">✅</span>
                  <span>Prazo de entrega: {project.deadline}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-primary">
                  R$ {project.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Cobrado {project.payment_frequency === 'monthly' ? 'mensalmente' :
                         project.payment_frequency === 'quarterly' ? 'trimestralmente' :
                         'anualmente'} via Stripe
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('briefing')} className="flex-1">
                Voltar ao Briefing
              </Button>
              <Button onClick={handleGoToPayment} className="flex-1">
                Continuar para Pagamento
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

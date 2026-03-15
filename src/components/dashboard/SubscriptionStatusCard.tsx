import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Zap, Clock, Film, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SlaCountdown } from '@/components/editor/SlaCountdown';
import type { UserProjectData } from '@/hooks/useUserProject';

interface Props {
  userProject: UserProjectData;
}

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  pro:      'Pro',
  business: 'Business',
  premium:  'Premium',
  agency:   'Agency',
};

interface InProgressDelivery {
  title: string;
  sla_deadline: string | null;
}

const SubscriptionStatusCard = ({ userProject }: Props) => {
  const [inProgress, setInProgress] = useState<InProgressDelivery | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [studioCredits, setStudioCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const tierLabel =
    TIER_LABELS[userProject.subscription_tier || ''] ||
    userProject.subscription_tier ||
    'Assinatura';
  const sla = userProject.sla_hours;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Delivery in progress
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('title, sla_deadline')
        .eq('user_project_id', userProject.id)
        .eq('status', 'in_progress')
        .limit(1)
        .maybeSingle();

      setInProgress(deliveryData as InProgressDelivery | null);

      // 2. Queue count
      const { count } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('user_project_id', userProject.id)
        .eq('status', 'queue');

      setQueueCount(count ?? 0);

      // 3. Studio credits
      if (userProject.studio_access) {
        const { data: creditsData } = await supabase
          .from('studio_credits')
          .select('credits_remaining')
          .eq('user_id', userProject.user_id)
          .limit(1)
          .maybeSingle();

        setStudioCredits(creditsData?.credits_remaining ?? 0);
      }

      setLoading(false);
    };

    fetchData();
  }, [userProject.id, userProject.user_id, userProject.studio_access]);

  const formatDeadlineBRT = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="glass animate-pulse">
        <CardContent className="p-3 h-20" />
      </Card>
    );
  }

  return (
    <div data-tour="subscription-card">
      <Card className="glass">
        <CardHeader className="p-3 md:p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-semibold text-primary">{tierLabel}</span>
            </div>
            {sla && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                <Zap className="h-3 w-3 mr-0.5" /> SLA {sla}h
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-4 pt-2 space-y-2">
          {/* In-progress delivery */}
          {inProgress ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Film className="h-3 w-3 text-primary" />
                <span className="text-xs font-mono text-foreground truncate">
                  {inProgress.title}
                </span>
              </div>
              {inProgress.sla_deadline && sla && (
                <div className="flex items-center gap-2 ml-[18px]">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    deadline: {formatDeadlineBRT(inProgress.sla_deadline)}
                  </span>
                  <SlaCountdown slaDeadline={inProgress.sla_deadline} slaHours={sla} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                Nenhum vídeo em produção agora
              </span>
            </div>
          )}

          {/* Queue count */}
          <div className="text-[10px] font-mono text-muted-foreground">
            Fila: {queueCount} vídeo(s) aguardando
          </div>

          {/* Script credits */}
          {['subscription', 'custom'].includes(userProject.client_type || '') && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Roteiros: <strong className="text-foreground">{(userProject as any).script_credits ?? 0}</strong> créditos</span>
            </div>
          )}

          {/* Studio link */}
          {userProject.studio_access && studioCredits !== null && (
            <Link
              to="/studio"
              className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline mt-1"
            >
              <Sparkles className="h-3 w-3" />
              Acessar Studio · {studioCredits} créditos
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionStatusCard;

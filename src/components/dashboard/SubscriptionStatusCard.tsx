import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Zap, Clock, Film, FileText } from 'lucide-react';
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
  
  const [loading, setLoading] = useState(true);

  const tierLabel =
    TIER_LABELS[userProject.subscription_tier || ''] ||
    userProject.subscription_tier ||
    'Assinatura';
  const sla = userProject.sla_hours;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('title, sla_deadline')
        .eq('user_project_id', userProject.id)
        .eq('status', 'in_progress')
        .limit(1)
        .maybeSingle();

      setInProgress(deliveryData as InProgressDelivery | null);

      const { count } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('user_project_id', userProject.id)
        .eq('status', 'queue');

      setQueueCount(count ?? 0);


      setLoading(false);
    };

    fetchData();
  }, [userProject.id]);

  const formatDeadlineBRT = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="kpi-dark animate-pulse" style={{ minHeight: '80px' }} />
    );
  }

  return (
    <div data-tour="subscription-card">
      <div className="kpi-dark" style={{ minHeight: 'auto' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-abba-lime" />
            <span className="text-sm font-sans font-semibold text-abba-lime">{tierLabel}</span>
          </div>
          {sla && (
            <Badge variant="outline" className="text-[10px] bg-abba-lime/10 text-abba-lime border-abba-lime/30 rounded-full">
              <Zap className="h-3 w-3 mr-0.5" /> SLA {sla}h
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {/* In-progress delivery */}
          {inProgress ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Film className="h-3 w-3 text-abba-lime" />
                <span className="text-xs font-sans text-foreground truncate">
                  {inProgress.title}
                </span>
              </div>
              {inProgress.sla_deadline && sla && (
                <div className="flex items-center gap-2 ml-[18px]">
                  <span className="text-[10px] font-sans text-white/60">
                    deadline: {formatDeadlineBRT(inProgress.sla_deadline)}
                  </span>
                  <SlaCountdown slaDeadline={inProgress.sla_deadline} slaHours={sla} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-white/60" />
              <span className="text-xs font-sans text-white/60">
                Nenhum vídeo em produção agora
              </span>
            </div>
          )}

          {/* Queue count */}
          <div className="text-[10px] font-sans text-white/60">
            Fila: {queueCount} vídeo(s) aguardando
          </div>

          {/* Script credits */}
          {['subscription', 'custom'].includes(userProject.client_type || '') && (
            <div className="flex items-center gap-1.5 text-xs font-sans text-white/60">
              <FileText className="h-3 w-3" />
              <span>Roteiros: <strong className="text-foreground">{(userProject as any).script_credits ?? 0}</strong> créditos</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard;

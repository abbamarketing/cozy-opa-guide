// 🎨 Design system: ver DESIGN_SYSTEM.md na raiz do projeto.
import { Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserProjectData } from '@/hooks/useUserProject';

interface Props {
  userProject: UserProjectData;
}

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  pro: 'Pro',
  business: 'Business',
  premium: 'Premium',
  agency: 'Agency',
};

const SubscriptionStatusCard = ({ userProject }: Props) => {
  const tierLabel =
    TIER_LABELS[userProject.subscription_tier || ''] ||
    userProject.subscription_tier ||
    'Assinatura';
  const sla = userProject.sla_hours;
  const periodEnd = new Date(userProject.current_period_end);

  return (
    <div data-tour="subscription-card" className="rounded-lg border border-border/30 bg-card/60 p-3 space-y-2">
      {/* Plano + SLA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{tierLabel}</span>
        </div>
        {sla && (
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 rounded-full px-2 py-0.5">
            <Zap className="h-3 w-3 mr-0.5" /> SLA {sla}h
          </Badge>
        )}
      </div>

      {/* Renovação */}
      <p className="text-[10px] text-muted-foreground">
        Renova em {format(periodEnd, "dd 'de' MMM", { locale: ptBR })}
      </p>
    </div>
  );
};

export default SubscriptionStatusCard;

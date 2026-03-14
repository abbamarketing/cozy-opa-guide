import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap } from 'lucide-react';
import type { UserProjectData } from '@/hooks/useUserProject';

interface Props {
  userProject: UserProjectData;
}

const TIER_LABELS: Record<string, string> = {
  standard_72h: 'Standard',
  pro_48h: 'Pro',
  business_24h: 'Business',
  premium_8h: 'Premium',
  agency_4h: 'Agency',
};

const SubscriptionStatusCard = ({ userProject }: Props) => {
  const tierLabel = TIER_LABELS[userProject.subscription_tier || ''] || userProject.subscription_tier || 'Assinatura';
  const sla = userProject.sla_hours;
  const periodEnd = userProject.current_period_end
    ? new Date(userProject.current_period_end).toLocaleDateString('pt-BR')
    : null;

  return (
    <Card className="p-3 space-y-2 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-card-foreground">{tierLabel}</span>
        <Badge variant="outline" className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/30">
          Ativo
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {sla && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> SLA {sla}h
          </span>
        )}
        {periodEnd && <span>Renova: {periodEnd}</span>}
      </div>
    </Card>
  );
};

export default SubscriptionStatusCard;

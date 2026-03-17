// 🎨 Design system: ver DESIGN_SYSTEM.md na raiz do projeto.
// Regras: cards p-4, text-sm para labels, ícones h-4 w-4, banners compactos em 1 linha.
import { useEffect, useState } from 'react';
import { Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
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
  const [usedCount, setUsedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const tierLabel =
    TIER_LABELS[userProject.subscription_tier || ''] ||
    userProject.subscription_tier ||
    'Assinatura';
  const sla = userProject.sla_hours;
  const quota = (userProject as any).monthly_quota ?? 0;

  useEffect(() => {
    const fetchUsed = async () => {
      setLoading(true);
      const { count } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('user_project_id', userProject.id)
        .in('status', ['in_progress', 'review', 'revision', 'approved', 'queue'] as any[]);
      setUsedCount(count ?? 0);
      setLoading(false);
    };
    fetchUsed();
  }, [userProject.id]);

  const pct = quota > 0 ? Math.min(100, Math.round((usedCount / quota) * 100)) : 0;

  if (loading) {
    return <div className="animate-pulse rounded-lg bg-muted/20 h-[88px]" />;
  }

  return (
    <div data-tour="subscription-card" className="rounded-lg border border-border/30 bg-card/60 p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-abba-lime" />
          <span className="text-sm font-semibold text-abba-lime">{tierLabel}</span>
        </div>
        {sla && (
          <Badge variant="outline" className="text-[10px] bg-abba-lime/10 text-abba-lime border-abba-lime/30 rounded-full px-2 py-0.5">
            <Zap className="h-3 w-3 mr-0.5" /> SLA {sla}h
          </Badge>
        )}
      </div>

      {/* Usage bar */}
      {quota > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Vídeos este mês</span>
            <span className="text-[11px] font-medium text-foreground">{usedCount} / {quota}</span>
          </div>
          <Progress value={pct} className="h-1.5 bg-muted/30 [&>div]:bg-abba-lime" />
        </div>
      )}

      {/* Period end */}
      <p className="text-[10px] text-muted-foreground">
        Renova em {new Date(userProject.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </p>
    </div>
  );
};

export default SubscriptionStatusCard;

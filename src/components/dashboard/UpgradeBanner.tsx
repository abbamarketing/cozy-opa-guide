import { useState } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { UserProjectData } from '@/hooks/useUserProject';

const UPGRADE_MAP: Record<string, {
  nextTier: string; label: string;
  currentPrice: number; nextPrice: number;
  benefit: string; slaHours: number;
}> = {
  standard: {
    nextTier: 'pro', label: 'Pro',
    currentPrice: 490, nextPrice: 690,
    benefit: 'Entregas em até 48h — metade do tempo',
    slaHours: 48,
  },
  pro: {
    nextTier: 'business', label: 'Business',
    currentPrice: 690, nextPrice: 1100,
    benefit: 'Entregas em até 24h — resposta no mesmo dia',
    slaHours: 24,
  },
  business: {
    nextTier: 'premium', label: 'Premium',
    currentPrice: 1100, nextPrice: 2970,
    benefit: 'Entregas em até 8h — prioridade máxima',
    slaHours: 8,
  },
  premium: {
    nextTier: 'agency', label: 'Agency',
    currentPrice: 2970, nextPrice: 5590,
    benefit: 'Entregas em até 4h — dedicação exclusiva',
    slaHours: 4,
  },
};

const DISMISS_KEY = (id: string) => `upgrade_banner_dismissed_${id}`;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function isDismissedCheck(projectId: string): boolean {
  const raw = localStorage.getItem(DISMISS_KEY(projectId));
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false;
  return Date.now() - ts < SEVEN_DAYS;
}

interface UpgradeBannerProps {
  userProject: UserProjectData;
}

const UpgradeBanner = ({ userProject }: UpgradeBannerProps) => {
  const [dismissed, setDismissed] = useState(() => isDismissedCheck(userProject.id));

  const clientType = userProject.client_type;
  const tier = userProject.subscription_tier;

  // Se for influencer, não mostrar nada
  if (userProject?.client_type === 'influencer') return null;
  if (clientType !== 'subscription') return null;
  if (!tier || tier === 'agency') return null;

  const nextPlan = UPGRADE_MAP[tier];
  if (!nextPlan) return null;

  const priceDiff = nextPlan.nextPrice - nextPlan.currentPrice;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY(userProject.id), String(Date.now()));
    setDismissed(true);
  };

  const handleCta = async () => {
    if (clientType === 'subscription' && userProject.stripe_subscription_id) {
      try {
        const { data } = await supabase.functions.invoke('create-portal-session', {
          body: {},
        });
        if (data?.url) {
          window.open(data.url, '_blank');
          return;
        }
      } catch {
        // fallback below
      }
    }
    window.open('/#planos', '_blank');
  };

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-purple-800/30 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 p-3">
      <div className="flex items-start gap-3">
        {/* Ícone — tamanho fixo, não encolhe */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
          <TrendingUp className="h-4 w-4 text-purple-400" />
        </div>

        {/* Texto — flex-1 garante que ocupa o espaço restante */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/70">
            Próximo nível
          </p>
          <p className="text-sm font-semibold text-foreground">
            Ascenda ao <span className="text-purple-300 font-bold">{nextPlan.label}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {nextPlan.benefit} · por mais R${priceDiff.toLocaleString('pt-BR')}/mês
          </p>

          {/* Badge de benefício + botão em linha */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-300">
              SLA {nextPlan.slaHours}h · {nextPlan.label}
            </span>
            <Button
              size="sm"
              onClick={handleCta}
              className="h-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] px-3"
            >
              Ver plano {nextPlan.label}
            </Button>
          </div>
        </div>

        {/* Fechar */}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default UpgradeBanner;

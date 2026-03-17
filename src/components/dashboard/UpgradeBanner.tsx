import { useState } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { UserProjectData } from '@/hooks/useUserProject';

const UPGRADE_MAP: Record<string, {
  nextTier: string; nextLabel: string;
  currentPrice: number; nextPrice: number;
  currentQuota: number; nextQuota: number; nextSla: string;
  highlight: string;
}> = {
  standard: {
    nextTier: 'pro', nextLabel: 'Pro',
    currentPrice: 490, nextPrice: 690,
    currentQuota: 7, nextQuota: 11, nextSla: '48h',
    highlight: 'Mais 4 vídeos por mês com o mesmo prazo de entrega',
  },
  pro: {
    nextTier: 'business', nextLabel: 'Business',
    currentPrice: 690, nextPrice: 1100,
    currentQuota: 11, nextQuota: 22, nextSla: '24h',
    highlight: 'Dobre sua capacidade — 22 vídeos/mês com entrega em 24h',
  },
  business: {
    nextTier: 'premium', nextLabel: 'Premium',
    currentPrice: 1100, nextPrice: 2970,
    currentQuota: 22, nextQuota: 66, nextSla: '8h',
    highlight: 'De 22 para 66 vídeos/mês com entrega em até 8h',
  },
  premium: {
    nextTier: 'agency', nextLabel: 'Agency',
    currentPrice: 2970, nextPrice: 5590,
    currentQuota: 66, nextQuota: 132, nextSla: '4h',
    highlight: '132 vídeos/mês — entrega em até 4 horas',
  },
};

const DISMISS_KEY = (id: string) => `upgrade_banner_dismissed_${id}`;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(projectId: string): boolean {
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
  const [dismissed, setDismissed] = useState(() => isDismissed(userProject.id));

  const clientType = userProject.client_type;
  const tier = userProject.subscription_tier;

  if (clientType !== 'subscription' && clientType !== 'influencer') return null;
  if (!tier || tier === 'agency') return null;
  if (dismissed) return null;

  const info = UPGRADE_MAP[tier];
  if (!info) return null;

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

  const priceDiff = info.nextPrice - info.currentPrice;

  return (
    <div className="relative bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-800/30 rounded-xl p-4 md:p-5">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
          <TrendingUp className="h-5 w-5 text-purple-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-purple-400/70">
            Próximo nível
          </p>
          <p className="text-sm font-sans font-semibold text-foreground">
            Ascenda ao <span className="text-purple-300 font-bold">{info.nextLabel}</span>
          </p>
          <p className="text-xs text-muted-foreground">{info.highlight}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[11px] font-sans font-medium text-purple-300">
              {info.nextQuota} vídeos/mês · SLA {info.nextSla}
            </span>
            {info.currentPrice > 0 && priceDiff > 0 && (
              <span className="text-[11px] text-muted-foreground">
                por mais R${priceDiff.toLocaleString('pt-BR')}/mês
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={handleCta}
          className="shrink-0 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-sans font-semibold text-xs gap-1.5 pr-4"
        >
          Ver plano {info.nextLabel}
        </Button>
      </div>
    </div>
  );
};

export default UpgradeBanner;

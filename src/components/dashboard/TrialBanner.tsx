import { Clock, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  trialEndDate: string | null;
  onUpgrade: () => void;
}

export function TrialBanner({ trialEndDate, onUpgrade }: TrialBannerProps) {
  const daysLeft = trialEndDate
    ? Math.max(0, Math.ceil(
        (new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-orange-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <Clock className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-200">
              {daysLeft > 0
                ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''} no seu trial`
                : 'Seu trial encerrou'}
            </p>
            <p className="text-xs text-amber-200/60">
              Você está testando o plano Standard gratuitamente.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-12 sm:pl-0">
          <Button
            size="sm"
            onClick={onUpgrade}
            className="gap-1.5 bg-amber-500 text-amber-950 hover:bg-amber-400 font-semibold text-xs h-8"
          >
            <Star className="h-3.5 w-3.5" />
            Assinar Standard — R$490/mês
          </Button>
          <a
            href="https://wa.me/5511999999999?text=Olá! Quero conhecer os planos da AbbaVideo."
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="gap-1.5 text-amber-200/70 hover:text-amber-200 text-xs h-8">
              <MessageCircle className="h-3.5 w-3.5" />
              Ver outros planos
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

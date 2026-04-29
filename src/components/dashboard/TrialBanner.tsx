import { Clock, Star, MessageCircle } from 'lucide-react';

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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground truncate">
          {daysLeft > 0
            ? `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} restantes no trial gratuito`
            : 'Seu trial encerrou'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onUpgrade}
          className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-80 transition-opacity"
        >
          <Star className="h-3 w-3" />
          Assinar Standard
        </button>
        <a
          href="https://wa.me/5538999117106?text=Olá! Quero conhecer os planos da AbbaVideo."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-3 w-3" />
          Outros planos
        </a>
      </div>
    </div>
  );
}

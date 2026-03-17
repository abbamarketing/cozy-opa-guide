import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, ChevronDown, ChevronUp, MapPin, Crown, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserProjectData } from '@/hooks/useUserProject';

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  pro: 'Pro',
  business: 'Business',
  premium: 'Premium',
  agency: 'Agency',
};

const getTierLabel = (tier?: string | null) =>
  TIER_LABELS[tier ?? ''] || 'Plano de Assinatura';

interface QuotaCardProps {
  userProject: UserProjectData;
}

interface QuotaLine {
  label: string;
  icon: React.ReactNode;
  used: number;
  total: number;
}

const QuotaRow = ({ label, icon, used, total }: QuotaLine) => {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={`text-xs font-sans ${pct >= 90 ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
      </div>
      <div className="w-full rounded-full overflow-hidden bg-white/5" style={{ height: '6px' }}>
        <div
          className="h-full rounded-full transition-all bg-abba-lime"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[10px] font-sans text-white/60">{used}/{total}</p>
    </div>
  );
};


// ─── Subscription/Influencer view: status only, no quota ───
const SubscriptionStatusCard = ({ userProject }: QuotaCardProps) => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const periodEnd = new Date(userProject.current_period_end);
  const daysUntilRenewal = differenceInDays(periodEnd, new Date());
  const tierLabel = getTierLabel(userProject.subscription_tier);
  const slaHours = (userProject as any).sla_hours ?? 72;

  const content = (
    <div className="space-y-2">
      {/* Plano + SLA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-abba-lime" />
          <span className="text-sm font-sans font-semibold text-abba-lime">{tierLabel}</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-abba-lime/10 text-abba-lime border-abba-lime/30 rounded-full px-2 py-0.5">
          <Zap className="h-3 w-3 mr-0.5" />
          SLA {slaHours}h
        </Badge>
      </div>
      {/* Renovação */}
      <p className="text-[10px] font-sans text-white/60">
        Renova em {format(periodEnd, "dd 'de' MMM", { locale: ptBR })}
        {daysUntilRenewal > 0 ? ` · ${daysUntilRenewal} dias` : ' · hoje'}
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <div data-tour="quota-card">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-[20px] bg-abba-surface border border-white/8 p-2.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-abba-lime" />
            <span className="text-xs font-sans font-semibold text-abba-lime">{tierLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-sans text-white/60">SLA {slaHours}h</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-white/60" /> : <ChevronDown className="h-3.5 w-3.5 text-white/60" />}
          </div>
        </button>
        {expanded && (
          <div className="mt-1 kpi-dark" style={{ minHeight: 'auto' }}>
            {content}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-tour="quota-card">
      <div className="kpi-dark" style={{ minHeight: 'auto' }}>
        {content}
      </div>
    </div>
  );
};

// ─── Custom view: original behavior (unchanged) ───
const CustomQuotaCard = ({ userProject }: QuotaCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const project = userProject.custom_project;
  const periodEnd = new Date(userProject.current_period_end);
  const daysUntilRenewal = differenceInDays(periodEnd, new Date());

  const quotas: QuotaLine[] = [];

  if (project.youtube_videos > 0) {
    quotas.push({
      label: 'YT',
      icon: <Video className="h-3.5 w-3.5 text-destructive" />,
      used: userProject.youtube_reserved + userProject.youtube_approved,
      total: project.youtube_videos,
    });
  }

  if (project.instagram_videos > 0) {
    quotas.push({
      label: 'IG',
      icon: <Camera className="h-3.5 w-3.5 text-abba-lime" />,
      used: userProject.instagram_reserved + userProject.instagram_approved,
      total: project.instagram_videos,
    });
  }

  if (project.include_thumbnails) {
    quotas.push({
      label: 'Thumb',
      icon: <Image className="h-3.5 w-3.5 text-white/60" />,
      used: userProject.thumbnails_reserved + userProject.thumbnails_approved,
      total: (project as any).thumbnail_limit ?? project.youtube_videos,
    });
  }

  if (project.include_covers) {
    quotas.push({
      label: 'Capa',
      icon: <Layers className="h-3.5 w-3.5 text-white/60" />,
      used: userProject.covers_reserved + userProject.covers_approved,
      total: (project as any).cover_limit ?? project.instagram_videos,
    });
  }

  if (project.include_capture) {
    quotas.push({
      label: 'Captação',
      icon: <MapPin className="h-3.5 w-3.5 text-abba-lime" />,
      used: (userProject.captures_reserved || 0) + (userProject.captures_approved || 0),
      total: project.max_captures || 1,
    });
  }

  if (isMobile) {
    return (
      <div data-tour="quota-card">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-[20px] bg-abba-surface border border-white/8 p-2.5 flex items-center gap-3"
        >
          <p className="text-xs font-sans font-semibold text-abba-lime truncate shrink-0">
            {project.project_name}
          </p>
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {quotas.slice(0, 3).map((q) => (
              <div key={q.label} className="flex items-center gap-1 shrink-0">
                {q.icon}
                <span className="text-[10px] font-sans text-white/60">
                  {q.used}/{q.total}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-sans text-white/60">
              {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-white/60" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-white/60" />
            )}
          </div>
        </button>
        {expanded && (
          <div className="mt-1 kpi-dark" style={{ minHeight: 'auto' }}>
            <div className="space-y-2">
              {quotas.map((q) => (
                <QuotaRow key={q.label} {...q} />
              ))}
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between text-[10px] font-sans text-white/60">
                <span>
                  Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-tour="quota-card">
      <div className="kpi-dark" style={{ minHeight: 'auto' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-abba-lime">
              SEU PROJETO
            </p>
            <p className="text-sm font-sans font-semibold text-abba-lime mt-0.5">
              {project.project_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans text-white/60">
              Renova em {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
          </div>
        </button>

        {expanded && (
          <div className="pt-3 space-y-2">
            <div className="space-y-2">
              {quotas.map((q) => (
                <QuotaRow key={q.label} {...q} />
              ))}
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between text-[10px] font-sans text-white/60">
              <span>
                Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main export: delegates based on client_type ───
const QuotaCard = ({ userProject }: QuotaCardProps) => {
  const clientType = userProject.client_type;

  if (clientType === 'subscription' || clientType === 'influencer') {
    return <SubscriptionStatusCard userProject={userProject} />;
  }

  // Default: custom
  return <CustomQuotaCard userProject={userProject} />;
};

export default QuotaCard;

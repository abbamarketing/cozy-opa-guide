import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, ChevronDown, ChevronUp, MapPin, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { UserProjectData } from '@/hooks/useUserProject';

interface QuotaCardProps {
  userProject: UserProjectData;
}

interface QuotaLine {
  label: string;
  icon: React.ReactNode;
  used: number;
  total: number;
}

const getBarColor = (pct: number) => {
  if (pct >= 90) return 'bg-destructive';
  if (pct >= 70) return 'bg-[hsl(var(--queue-yellow))]';
  return 'bg-primary';
};

const QuotaRow = ({ label, icon, used, total }: QuotaLine) => {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor = getBarColor(pct);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 min-w-[80px]">
        {icon}
        <span className="text-xs font-mono text-foreground">{label}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground min-w-[32px] text-right">
        {used}/{total}
      </span>
    </div>
  );
};

// ─── Studio view: shows script credits ───
const StudioQuotaCard = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('studio_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .maybeSingle();
      setCredits(data?.credits_remaining ?? 0);
    };
    fetch();
  }, [user]);

  const total = 10;
  const used = total - (credits ?? 0);
  const pct = Math.round((used / total) * 100);

  return (
    <div data-tour="quota-card">
      <Card className="glass">
        <CardContent className="p-3 md:p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            CRÉDITOS DE ROTEIRO
          </p>
          <QuotaRow
            label="Roteiros"
            icon={<FileText className="h-3.5 w-3.5 text-primary" />}
            used={used}
            total={total}
          />
          <p className="text-[10px] font-mono text-muted-foreground">
            {credits ?? 0} créditos de roteiro restantes
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Subscription view: shows only short video quota ───
const SubscriptionQuotaCard = ({ userProject }: QuotaCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const periodEnd = new Date(userProject.current_period_end);
  const daysUntilRenewal = differenceInDays(periodEnd, new Date());

  const totalVideos = userProject.custom_project?.instagram_videos
    ?? (userProject as any).monthly_quota
    ?? 0;
  const usedVideos = userProject.instagram_reserved + userProject.instagram_approved;
  const remaining = Math.max(0, totalVideos - usedVideos);

  const quota: QuotaLine = {
    label: 'Reels / Shorts / TikToks',
    icon: <Video className="h-3.5 w-3.5 text-primary" />,
    used: usedVideos,
    total: totalVideos,
  };

  if (isMobile) {
    return (
      <div data-tour="quota-card">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full glass rounded-lg p-2.5 flex items-center gap-3"
        >
          <p className="text-xs font-mono font-semibold text-primary truncate shrink-0">
            {project.project_name}
          </p>
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1 shrink-0">
              <Video className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">
                {remaining} restantes
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </button>
        {expanded && (
          <Card className="mt-1 glass">
            <CardContent className="p-3 space-y-1.5">
              <QuotaRow {...quota} />
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>
                  Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div data-tour="quota-card">
      <Card className="glass">
        <CardHeader className="p-3 md:p-4 pb-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                SEU PLANO
              </p>
              <p className="text-sm font-mono font-semibold text-primary mt-0.5">
                {project.project_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                Renova em {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
              </span>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CardHeader>

        {expanded && (
          <CardContent className="p-3 md:p-4 pt-2 space-y-2">
            <QuotaRow {...quota} />
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>
                Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
              </span>
            </div>
          </CardContent>
        )}
      </Card>
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
      icon: <Camera className="h-3.5 w-3.5 text-primary" />,
      used: userProject.instagram_reserved + userProject.instagram_approved,
      total: project.instagram_videos,
    });
  }

  if (project.include_thumbnails) {
    quotas.push({
      label: 'Thumb',
      icon: <Image className="h-3.5 w-3.5 text-muted-foreground" />,
      used: userProject.thumbnails_reserved + userProject.thumbnails_approved,
      total: (project as any).thumbnail_limit ?? project.youtube_videos,
    });
  }

  if (project.include_covers) {
    quotas.push({
      label: 'Capa',
      icon: <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
      used: userProject.covers_reserved + userProject.covers_approved,
      total: (project as any).cover_limit ?? project.instagram_videos,
    });
  }

  if (project.include_capture) {
    quotas.push({
      label: 'Captação',
      icon: <MapPin className="h-3.5 w-3.5 text-primary" />,
      used: (userProject.captures_reserved || 0) + (userProject.captures_approved || 0),
      total: project.max_captures || 1,
    });
  }

  if (isMobile) {
    return (
      <div data-tour="quota-card">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full glass rounded-lg p-2.5 flex items-center gap-3"
        >
          <p className="text-xs font-mono font-semibold text-primary truncate shrink-0">
            {project.project_name}
          </p>
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {quotas.slice(0, 3).map((q) => (
              <div key={q.label} className="flex items-center gap-1 shrink-0">
                {q.icon}
                <span className="text-[10px] font-mono text-muted-foreground">
                  {q.used}/{q.total}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </button>
        {expanded && (
          <Card className="mt-1 glass">
            <CardContent className="p-3 space-y-1.5">
              {quotas.map((q) => (
                <QuotaRow key={q.label} {...q} />
              ))}
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>
                  Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div data-tour="quota-card">
      <Card className="glass">
        <CardHeader className="p-3 md:p-4 pb-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                SEU PROJETO
              </p>
              <p className="text-sm font-mono font-semibold text-primary mt-0.5">
                {project.project_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                Renova em {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'hoje'}
              </span>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CardHeader>

        {expanded && (
          <CardContent className="p-3 md:p-4 pt-2 space-y-2">
            <div className="space-y-1.5">
              {quotas.map((q) => (
                <QuotaRow key={q.label} {...q} />
              ))}
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>
                Período: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
              </span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

// ─── Main export: delegates based on client_type ───
const QuotaCard = ({ userProject }: QuotaCardProps) => {
  const clientType = userProject.client_type;

  if (clientType === 'studio') {
    return <StudioQuotaCard />;
  }

  if (clientType === 'subscription') {
    return <SubscriptionQuotaCard userProject={userProject} />;
  }

  // Default: custom — original behavior
  return <CustomQuotaCard userProject={userProject} />;
};

export default QuotaCard;

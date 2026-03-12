import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const available = Math.max(0, total - used);
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

const QuotaCard = ({ userProject }: QuotaCardProps) => {
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
      total: project.youtube_videos,
    });
  }

  if (project.include_covers) {
    quotas.push({
      label: 'Capa',
      icon: <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
      used: userProject.covers_reserved + userProject.covers_approved,
      total: project.instagram_videos,
    });
  }

  // On mobile, show compact version with expand toggle
  const showDetails = !isMobile || expanded;

  return (
    <div data-tour="quota-card">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-3 md:p-4 pb-0">
          <button
            onClick={() => isMobile && setExpanded(!expanded)}
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
              {isMobile && (
                expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CardHeader>

        <CardContent className="p-3 md:p-4 pt-2 space-y-2">
          {/* Quotas - always visible */}
          <div className="space-y-1.5">
            {quotas.map((q) => (
              <QuotaRow key={q.label} {...q} />
            ))}
          </div>

          {/* Expandable details */}
          {showDetails && (
            <>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>
                  Periodo: {format(new Date(userProject.current_period_start), 'dd/MM', { locale: ptBR })} – {format(periodEnd, 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotaCard;

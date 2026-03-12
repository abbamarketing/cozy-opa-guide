import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  if (pct >= 70) return 'bg-[hsl(45,93%,47%)]';
  return 'bg-primary';
};

const QuotaRow = ({ label, icon, used, total }: QuotaLine) => {
  const available = Math.max(0, total - used);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor = getBarColor(pct);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-card-foreground">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-mono-code text-xs text-muted-foreground">
          {used}/{total}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {available} disponíve{available !== 1 ? 'is' : 'l'}
      </p>
    </div>
  );
};

const QuotaCard = ({ userProject }: QuotaCardProps) => {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const project = userProject.custom_project;
  const periodStart = new Date(userProject.current_period_start);
  const periodEnd = new Date(userProject.current_period_end);
  const daysUntilRenewal = differenceInDays(periodEnd, new Date());

  const quotas: QuotaLine[] = [];

  if (project.youtube_videos > 0) {
    quotas.push({
      label: 'YouTube',
      icon: <Video className="h-4 w-4 text-destructive" />,
      used: userProject.youtube_reserved + userProject.youtube_approved,
      total: project.youtube_videos,
    });
  }

  if (project.instagram_videos > 0) {
    quotas.push({
      label: 'Instagram',
      icon: <Camera className="h-4 w-4 text-[hsl(280,80%,65%)]" />,
      used: userProject.instagram_reserved + userProject.instagram_approved,
      total: project.instagram_videos,
    });
  }

  if (project.include_thumbnails) {
    quotas.push({
      label: 'Thumbnails',
      icon: <Image className="h-4 w-4 text-[hsl(200,80%,60%)]" />,
      used: userProject.thumbnails_reserved + userProject.thumbnails_approved,
      total: project.youtube_videos,
    });
  }

  if (project.include_covers) {
    quotas.push({
      label: 'Capas',
      icon: <Layers className="h-4 w-4 text-[hsl(45,93%,47%)]" />,
      used: userProject.covers_reserved + userProject.covers_approved,
      total: project.instagram_videos,
    });
  }

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (err: any) {
      console.error('Portal error:', err);
      toast.error(err.message || 'Erro ao abrir portal de assinatura');
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <span className="uppercase tracking-wider text-xs text-muted-foreground">
            Seu Projeto
          </span>
        </CardTitle>
        <p className="text-lg font-bold text-primary">{project.project_name}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {quotas.map((q) => (
          <QuotaRow key={q.label} {...q} />
        ))}

        <Separator className="my-2 bg-border/50" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Período: {format(periodStart, 'dd/MM', { locale: ptBR })} –{' '}
            {format(periodEnd, 'dd/MM', { locale: ptBR })}
          </span>
          <span>
            Renova em:{' '}
            <span className="font-medium text-card-foreground">
              {daysUntilRenewal > 0 ? `${daysUntilRenewal} dias` : 'Hoje'}
            </span>
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground"
          onClick={handleManageSubscription}
          disabled={loadingPortal || !userProject.stripe_subscription_id}
        >
          {loadingPortal ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          Gerenciar Assinatura
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuotaCard;

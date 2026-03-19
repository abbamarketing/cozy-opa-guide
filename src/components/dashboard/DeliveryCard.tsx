import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { remainingBusinessMinutes, formatBusinessCountdown } from '@/lib/business-hours';

const isSubscriptionLike = (clientType: string | null | undefined) =>
  clientType === 'subscription' || clientType === 'influencer';

export interface DeliveryData {
  id: string;
  title: string;
  description: string | null;
  delivery_type: 'youtube_video' | 'instagram_video' | 'thumbnail' | 'cover';
  status: string;
  due_date: string | null;
  revision_count: number;
  max_revisions: number;
  file_url: string | null;
  thumbnail_url: string | null;
  editor_name?: string;
  editor_id: string | null;
  created_at: string;
  delivered_at: string | null;
  approved_at: string | null;
  revision_notes: string | null;
  user_project_id: string;
  raw_file_url: string | null;
  raw_drive_link: string | null;
  client_notes: string | null;
  is_exception: boolean | null;
  exception_notes: string | null;
}

export const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  youtube_video: { icon: Video, label: 'YouTube' },
  instagram_video: { icon: Camera, label: 'Instagram' },
  thumbnail: { icon: Image, label: 'Thumbnail' },
  cover: { icon: Layers, label: 'Capa' },
};

export const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'A Fazer', variant: 'secondary' },
  in_progress: { label: 'Em Produção', variant: 'outline' },
  review: { label: 'Revisar', variant: 'default' },
  revision: { label: 'Revisão', variant: 'destructive' },
  approved: { label: 'Concluído', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

/* ───── SLA helpers ───── */

interface SlaIndicator {
  color: string;
  label: string;
  level: 'ok' | 'warning' | 'danger' | 'overdue' | 'none';
  progressPercent: number;
}

function getSlaIndicator(dueDate: string | null, createdAt: string): SlaIndicator {
  if (!dueDate) return { color: 'text-muted-foreground', label: 'Sem prazo', level: 'none', progressPercent: 0 };

  const due = new Date(dueDate);
  const created = new Date(createdAt);

  const remainingBizMin = remainingBusinessMinutes(due);
  const totalBizMin = remainingBusinessMinutes(due, created);
  const elapsed = totalBizMin - remainingBizMin;
  const progressPercent = totalBizMin > 0 ? Math.min(100, Math.max(0, (elapsed / totalBizMin) * 100)) : 0;

  const countdown = formatBusinessCountdown(remainingBizMin);

  if (remainingBizMin < 0) {
    return { color: 'text-destructive', label: countdown, level: 'overdue', progressPercent: 100 };
  }
  if (remainingBizMin <= 360) {
    return { color: 'text-destructive', label: countdown, level: 'danger', progressPercent };
  }
  if (remainingBizMin <= 720) {
    return { color: 'text-[hsl(var(--queue-yellow))]', label: countdown, level: 'warning', progressPercent };
  }
  return { color: 'text-[hsl(var(--queue-green))]', label: countdown, level: 'ok', progressPercent };
}

/* ───── Component ───── */

interface DeliveryCardProps {
  delivery: DeliveryData;
  onClick: () => void;
  clientType?: string | null;
}

const DeliveryCard = ({ delivery, onClick, clientType }: DeliveryCardProps) => {
  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const Icon = config.icon;
  const displayLabel = isSubscriptionLike(clientType) ? 'Vídeo' : config.label;

  // Live countdown
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!delivery.due_date || delivery.status === 'approved' || delivery.status === 'cancelled') return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [delivery.due_date, delivery.status]);

  const sla = getSlaIndicator(delivery.due_date, delivery.created_at);
  const isCompleted = delivery.status === 'approved' || delivery.status === 'cancelled';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer card-elevate rounded-[20px] bg-secondary border border-border p-3 space-y-2 w-full max-w-full overflow-hidden"
    >
      {/* Linha 1: ícone + título + status de fila */}
      <div className="flex items-start gap-2 min-w-0">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="line-clamp-2 break-words text-sm font-sans font-semibold text-foreground">{delivery.title}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-sans text-muted-foreground">
            <span>{displayLabel}</span>
            {delivery.editor_name && <span>· {delivery.editor_name}</span>}
            {delivery.status === 'queue' && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-sans leading-none">
                · Aguardando editor
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Linha 2: SLA + barra de progresso */}
      {delivery.due_date && !isCompleted && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-sans">
            {sla.level === 'overdue' ? (
              <AlertTriangle className={`h-3 w-3 ${sla.color}`} />
            ) : (
              <Clock className={`h-3 w-3 ${sla.color}`} />
            )}
            <span className="text-muted-foreground">
              {format(new Date(delivery.due_date), "dd/MM HH'h'", { locale: ptBR })}
            </span>
            <span className={`ml-auto font-medium ${sla.color}`}>{sla.label}</span>
          </div>

          <div className="h-[6px] w-full overflow-hidden rounded-full bg-foreground/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${sla.progressPercent}%`,
                background: sla.level === 'danger' || sla.level === 'overdue' ? '#ef4444' : 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>
      )}

      {/* SLA para entrega concluída */}
      {delivery.due_date && isCompleted && (
        <div className="flex items-center gap-1.5 text-[11px] font-sans">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {format(new Date(delivery.due_date), "dd/MM HH'h'", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Revisões */}
      <p className="text-[11px] font-sans text-muted-foreground">
        Revisões: {delivery.revision_count}/{delivery.max_revisions}
      </p>
    </div>
  );
};

export default DeliveryCard;

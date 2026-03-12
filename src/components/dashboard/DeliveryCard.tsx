import { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
}

export const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  youtube_video: { icon: Video, label: 'YouTube' },
  instagram_video: { icon: Camera, label: 'Instagram' },
  thumbnail: { icon: Image, label: 'Thumbnail' },
  cover: { icon: Layers, label: 'Capa' },
};

export const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'A Fazer', variant: 'secondary' },
  in_progress: { label: 'Em Producao', variant: 'outline' },
  review: { label: 'Revisar', variant: 'default' },
  revision: { label: 'Revisao', variant: 'destructive' },
  approved: { label: 'Concluido', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

/* ───── SLA helpers ───── */

interface SlaIndicator {
  color: string;
  label: string;
  level: 'ok' | 'warning' | 'danger' | 'overdue' | 'none';
  progressPercent: number;
}

function formatCountdown(totalMinutes: number): string {
  if (totalMinutes < 0) {
    const absMin = Math.abs(totalMinutes);
    if (absMin >= 1440) return `−${Math.floor(absMin / 1440)}d ${Math.floor((absMin % 1440) / 60)}h`;
    if (absMin >= 60) return `−${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    return `−${absMin}m`;
  }
  if (totalMinutes >= 1440) {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    return `${days}d ${hours}h`;
  }
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${totalMinutes}m`;
}

function getSlaIndicator(dueDate: string | null, createdAt: string): SlaIndicator {
  if (!dueDate) return { color: 'text-muted-foreground', label: 'Sem prazo', level: 'none', progressPercent: 0 };

  const now = new Date();
  const due = new Date(dueDate);
  const created = new Date(createdAt);
  const totalMinutes = differenceInMinutes(due, now);
  const totalDuration = differenceInMinutes(due, created);
  const elapsed = totalDuration - totalMinutes;
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

  const countdown = formatCountdown(totalMinutes);

  if (totalMinutes < 0) {
    return { color: 'text-destructive', label: countdown, level: 'overdue', progressPercent: 100 };
  }
  if (totalMinutes <= 360) {
    return { color: 'text-destructive', label: countdown, level: 'danger', progressPercent };
  }
  if (totalMinutes <= 720) {
    return { color: 'text-[hsl(var(--queue-yellow))]', label: countdown, level: 'warning', progressPercent };
  }
  return { color: 'text-[hsl(var(--queue-green))]', label: countdown, level: 'ok', progressPercent };
}

/* ───── Component ───── */

interface DeliveryCardProps {
  delivery: DeliveryData;
  onClick: () => void;
}

const DeliveryCard = ({ delivery, onClick }: DeliveryCardProps) => {
  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const Icon = config.icon;

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
    <Card
      onClick={onClick}
      className="cursor-pointer border-border bg-card p-3 transition-colors active:bg-muted hover:bg-muted/50 space-y-2 shadow-sm"
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">{delivery.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">{config.label}</span>
            {delivery.editor_name && (
              <span className="text-[10px] font-mono text-muted-foreground">· {delivery.editor_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* SLA section */}
      {delivery.due_date && !isCompleted && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {sla.level === 'overdue' ? (
              <AlertTriangle className={`h-3 w-3 ${sla.color}`} />
            ) : (
              <Clock className={`h-3 w-3 ${sla.color}`} />
            )}
            <span className="text-muted-foreground">
              {format(new Date(delivery.due_date), "dd/MM HH'h'", { locale: ptBR })}
            </span>
            <span className={`ml-auto font-medium ${sla.color}`}>
              {sla.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sla.level === 'overdue' || sla.level === 'danger'
                  ? 'bg-destructive'
                  : sla.level === 'warning'
                  ? 'bg-[hsl(var(--queue-yellow))]'
                  : 'bg-[hsl(var(--queue-green))]'
              }`}
              style={{ width: `${sla.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {delivery.due_date && isCompleted && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {format(new Date(delivery.due_date), "dd/MM HH'h'", { locale: ptBR })}
          </span>
        </div>
      )}

      <p className="text-[10px] font-mono text-muted-foreground">
        Revisoes: {delivery.revision_count}/{delivery.max_revisions}
      </p>
    </Card>
  );
};

export default DeliveryCard;

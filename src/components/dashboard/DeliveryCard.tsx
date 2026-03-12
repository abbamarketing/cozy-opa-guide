import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, Clock } from 'lucide-react';
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
  in_progress: { label: 'Em Produção', variant: 'outline' },
  review: { label: 'Revisar', variant: 'default' },
  revision: { label: 'Revisão', variant: 'destructive' },
  approved: { label: 'Concluído', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const getDeadlineIndicator = (dueDate: string | null) => {
  if (!dueDate) return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Sem prazo' };
  const now = new Date();
  const due = new Date(dueDate);
  const hoursLeft = differenceInHours(due, now);

  if (hoursLeft < 0) return { color: 'text-destructive', bg: 'bg-destructive/20', label: 'Atrasado' };
  if (hoursLeft <= 6) return { color: 'text-destructive', bg: 'bg-destructive/20', label: `${hoursLeft}h restantes` };
  if (hoursLeft <= 12) return { color: 'text-[hsl(45,93%,47%)]', bg: 'bg-[hsl(45,93%,47%)]/20', label: `${hoursLeft}h restantes` };
  return { color: 'text-primary', bg: 'bg-primary/20', label: `${hoursLeft}h restantes` };
};

interface DeliveryCardProps {
  delivery: DeliveryData;
  onClick: () => void;
}

const DeliveryCard = ({ delivery, onClick }: DeliveryCardProps) => {
  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const Icon = config.icon;
  const deadline = getDeadlineIndicator(delivery.due_date);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border-border/40 bg-card/80 p-3 transition-all hover:border-border hover:bg-card space-y-2"
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-card-foreground">{delivery.title}</p>
          {delivery.editor_name && (
            <p className="text-xs text-muted-foreground">Editor: {delivery.editor_name}</p>
          )}
        </div>
      </div>

      {delivery.due_date && (
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className={`h-3 w-3 ${deadline.color}`} />
          <span className="text-muted-foreground">
            {format(new Date(delivery.due_date), "dd/MM 'às' HH'h'", { locale: ptBR })}
          </span>
          <Badge variant="outline" className={`ml-auto text-[10px] px-1.5 py-0 ${deadline.bg} ${deadline.color} border-0`}>
            {deadline.label}
          </Badge>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Revisões: {delivery.revision_count}/{delivery.max_revisions} usadas
      </p>
    </Card>
  );
};

export default DeliveryCard;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProject } from '@/hooks/useUserProject';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Download, ExternalLink, Video, Camera, Image, Layers } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Delivery = Tables<'deliveries'>;

const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  youtube_video: { label: 'YouTube', icon: Video },
  instagram_video: { label: 'Instagram', icon: Camera },
  thumbnail: { label: 'Thumbnail', icon: Image },
  cover: { label: 'Capa', icon: Layers },
};

export default function DeliveryHistory() {
  const { userProject } = useUserProject();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProject?.id) loadApproved();
  }, [userProject?.id]);

  const loadApproved = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('deliveries')
      .select('*')
      .eq('user_project_id', userProject!.id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    setDeliveries(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h3 className="text-lg font-semibold text-card-foreground">Nenhuma entrega aprovada ainda</h3>
        <p className="text-sm text-muted-foreground">
          Quando você aprovar entregas, elas aparecerão aqui para download.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-card-foreground">
          {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''} aprovada{deliveries.length !== 1 ? 's' : ''}
        </h3>
      </div>

      {deliveries.map((d) => {
        const cfg = typeConfig[d.delivery_type] || typeConfig.youtube_video;
        const Icon = cfg.icon;
        const approvedDate = d.approved_at
          ? new Date(d.approved_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—';

        return (
          <Card key={d.id} className="glass border-border/40">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{d.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {cfg.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Aprovado em {approvedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {d.file_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" title="Download">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {d.drive_link && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={d.drive_link} target="_blank" rel="noopener noreferrer" title="Abrir Drive">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {!d.file_url && !d.drive_link && (
                  <span className="text-[10px] text-muted-foreground">Sem arquivo</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

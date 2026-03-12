import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import NewDeliveryModal from './NewDeliveryModal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DeliveryCard, { type DeliveryData } from './DeliveryCard';
import type { UserProjectData } from '@/hooks/useUserProject';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanProps {
  userProject: UserProjectData;
}

interface Column {
  id: string;
  title: string;
  statuses: string[];
  description: string;
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'A FAZER', statuses: ['pending'], description: 'Aguardando início' },
  { id: 'production', title: 'EM PRODUÇÃO', statuses: ['in_progress'], description: 'Editor trabalhando' },
  { id: 'review', title: 'REVISAR', statuses: ['review'], description: 'Pronto para sua aprovação' },
  { id: 'done', title: 'CONCLUÍDO', statuses: ['approved'], description: 'Aprovado e finalizado' },
];

const Kanban = ({ userProject }: KanbanProps) => {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, editor:editors(display_name)')
      .eq('user_project_id', userProject.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (!error && data) {
      setDeliveries(
        data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          delivery_type: d.delivery_type,
          status: d.status,
          due_date: d.due_date,
          revision_count: d.revision_count,
          max_revisions: d.max_revisions,
          file_url: d.file_url,
          editor_name: d.editor?.display_name || null,
        })),
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDeliveries();

    // Realtime
    const channel = supabase
      .channel(`deliveries-${userProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `user_project_id=eq.${userProject.id}`,
        },
        () => {
          fetchDeliveries();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProject.id]);

  // Quota check
  const hasQuota = () => {
    const p = userProject.custom_project;
    const ytUsed = userProject.youtube_reserved + userProject.youtube_approved;
    const igUsed = userProject.instagram_reserved + userProject.instagram_approved;
    const thUsed = userProject.thumbnails_reserved + userProject.thumbnails_approved;
    const cvUsed = userProject.covers_reserved + userProject.covers_approved;

    if (p.youtube_videos > 0 && ytUsed < p.youtube_videos) return true;
    if (p.instagram_videos > 0 && igUsed < p.instagram_videos) return true;
    if (p.include_thumbnails && thUsed < p.youtube_videos) return true;
    if (p.include_covers && cvUsed < p.instagram_videos) return true;
    return false;
  };

  const quotaAvailable = hasQuota();

  const handleApprove = async (delivery: DeliveryData) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', delivery.id);

    if (error) {
      toast.error('Erro ao aprovar entrega');
    } else {
      toast.success('Entrega aprovada!');
      setSelectedDelivery(null);
      fetchDeliveries();
    }
  };

  const handleRequestRevision = async (delivery: DeliveryData) => {
    if (delivery.revision_count >= delivery.max_revisions) {
      toast.error('Limite de revisões atingido');
      return;
    }

    const { error } = await supabase
      .from('deliveries')
      .update({
        status: 'revision',
        revision_count: delivery.revision_count + 1,
      })
      .eq('id', delivery.id);

    if (error) {
      toast.error('Erro ao solicitar revisão');
    } else {
      toast.success('Revisão solicitada');
      setSelectedDelivery(null);
      fetchDeliveries();
    }
  };

  const getDeliveriesForColumn = (col: Column) =>
    deliveries.filter((d) => col.statuses.includes(d.status));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Minhas Entregas</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                disabled={!quotaAvailable}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </span>
          </TooltipTrigger>
          {!quotaAvailable && (
            <TooltipContent>
              <p>Você não tem quota disponível para este tipo</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Kanban Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c.id} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = getDeliveriesForColumn(col);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl border border-border/40 bg-muted/30 p-2"
              >
                {/* Column header */}
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {col.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
                    >
                      {items.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">{col.description}</p>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-0.5">
                    {items.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground/50">
                        Nenhuma entrega
                      </p>
                    ) : (
                      items.map((d) => (
                        <DeliveryCard
                          key={d.id}
                          delivery={d}
                          onClick={() => setSelectedDelivery(d)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-md">
          {selectedDelivery && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDelivery.title}</DialogTitle>
                <DialogDescription>
                  {selectedDelivery.description || 'Sem descrição'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Editor</span>
                  <span className="text-foreground">{selectedDelivery.editor_name || '—'}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Prazo</span>
                  <span className="text-foreground">
                    {selectedDelivery.due_date
                      ? format(new Date(selectedDelivery.due_date), "dd/MM/yyyy 'às' HH'h'", {
                          locale: ptBR,
                        })
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Revisões</span>
                  <span className="text-foreground">
                    {selectedDelivery.revision_count}/{selectedDelivery.max_revisions}
                  </span>
                </div>
              </div>

              {/* Actions based on status */}
              <div className="flex gap-2 pt-2">
                {selectedDelivery.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => window.open(selectedDelivery.file_url!, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </Button>
                )}

                {selectedDelivery.status === 'review' && (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleApprove(selectedDelivery)}
                    >
                      <Check className="h-3.5 w-3.5" /> Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedDelivery.revision_count >= selectedDelivery.max_revisions}
                      onClick={() => handleRequestRevision(selectedDelivery)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revisão
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kanban;

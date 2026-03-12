import { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { Plus, Camera, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DeliveryCard, { type DeliveryData } from './DeliveryCard';
import type { UserProjectData } from '@/hooks/useUserProject';
import { useIsMobile } from '@/hooks/use-mobile';

const NewDeliveryModal = lazy(() => import('./NewDeliveryModal'));
const DeliveryDetailModal = lazy(() => import('./DeliveryDetailModal'));
const CaptureScheduleModal = lazy(() => import('./CaptureScheduleModal'));

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
  { id: 'todo', title: 'A FAZER', statuses: ['pending'], description: 'Aguardando inicio' },
  { id: 'production', title: 'PRODUCAO', statuses: ['in_progress', 'revision'], description: 'Editor trabalhando' },
  { id: 'review', title: 'REVISAR', statuses: ['review'], description: 'Pronto para aprovacao' },
  { id: 'done', title: 'CONCLUIDO', statuses: ['approved'], description: 'Aprovado e finalizado' },
];

const PAGE_SIZE = 20;

const Kanban = ({ userProject }: KanbanProps) => {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeColumn, setActiveColumn] = useState('todo');
  const isMobile = useIsMobile();

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
          thumbnail_url: d.thumbnail_url,
          editor_name: d.editor?.display_name || null,
          editor_id: d.editor_id,
          created_at: d.created_at,
          delivered_at: d.delivered_at,
          approved_at: d.approved_at,
          revision_notes: d.revision_notes,
          user_project_id: d.user_project_id,
        })),
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDeliveries();

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
        () => fetchDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProject.id]);

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

  const getDeliveriesForColumn = (col: Column) =>
    deliveries.filter((d) => col.statuses.includes(d.status));

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Mobile: segmented control with single column view
  if (isMobile) {
    const currentCol = COLUMNS.find(c => c.id === activeColumn) || COLUMNS[0];
    const items = getDeliveriesForColumn(currentCol);

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-mono font-semibold text-foreground">Entregas</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  disabled={!quotaAvailable}
                  className="gap-1.5 h-9"
                  onClick={() => setShowNewModal(true)}
                  data-tour="new-delivery-btn"
                >
                  <Plus className="h-4 w-4" />
                  Nova
                </Button>
              </span>
            </TooltipTrigger>
            {!quotaAvailable && (
              <TooltipContent>
                <p>Quota esgotada</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Column Tabs */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-secondary rounded-lg p-1" data-tour="kanban-board">
              {COLUMNS.map((col) => {
                const count = getDeliveriesForColumn(col).length;
                const isActive = activeColumn === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveColumn(col.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[10px] font-mono font-medium tracking-wider transition-colors ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {col.title}
                    {count > 0 && (
                      <span className={`text-[9px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-xs font-mono text-muted-foreground">
                    Nenhuma entrega
                  </p>
                </div>
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
          </>
        )}

        {/* Modals */}
        <Suspense fallback={null}>
          <DeliveryDetailModal
            open={!!selectedDelivery}
            onOpenChange={() => setSelectedDelivery(null)}
            delivery={selectedDelivery}
            onUpdated={fetchDeliveries}
          />
          {showNewModal && (
            <NewDeliveryModal
              open={showNewModal}
              onOpenChange={setShowNewModal}
              userProject={userProject}
              onCreated={fetchDeliveries}
            />
          )}
        </Suspense>
      </div>
    );
  }

  // Desktop: original 4-column grid
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-mono font-semibold text-foreground">Minhas Entregas</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                disabled={!quotaAvailable}
                className="gap-1.5"
                onClick={() => setShowNewModal(true)}
                data-tour="new-delivery-btn"
              >
                <Plus className="h-4 w-4" />
                Nova Solicitacao
              </Button>
            </span>
          </TooltipTrigger>
          {!quotaAvailable && (
            <TooltipContent>
              <p>Quota esgotada</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((c) => (
            <Skeleton key={c.id} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3" data-tour="kanban-board">
          {COLUMNS.map((col) => {
            const allItems = getDeliveriesForColumn(col);
            const items = allItems.slice(0, visibleCount);
            const hasMore = allItems.length > visibleCount;
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-lg border border-border bg-muted/30 p-2"
              >
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                      {col.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] justify-center px-1.5 text-[10px] font-mono"
                    >
                      {allItems.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">{col.description}</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-0.5">
                    {items.length === 0 ? (
                      <p className="py-8 text-center text-[10px] font-mono text-muted-foreground/50">
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
                    {hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={handleLoadMore}
                      >
                        Carregar mais ({allItems.length - visibleCount})
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      <Suspense fallback={null}>
        <DeliveryDetailModal
          open={!!selectedDelivery}
          onOpenChange={() => setSelectedDelivery(null)}
          delivery={selectedDelivery}
          onUpdated={fetchDeliveries}
        />
        {showNewModal && (
          <NewDeliveryModal
            open={showNewModal}
            onOpenChange={setShowNewModal}
            userProject={userProject}
            onCreated={fetchDeliveries}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Kanban;

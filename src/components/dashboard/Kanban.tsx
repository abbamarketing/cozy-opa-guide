import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { Plus, Camera, AlertCircle, Video, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DeliveryCard, { type DeliveryData } from './DeliveryCard';
import { useDeliveries } from '@/hooks/useDeliveries';
import type { UserProjectData } from '@/hooks/useUserProject';
import { useIsMobile } from '@/hooks/use-mobile';
import ViewToggle, { type ViewMode } from '@/components/shared/ViewToggle';
import DeliveryListView from '@/components/shared/DeliveryListView';
import DeliveryCalendarView from '@/components/shared/DeliveryCalendarView';

const NewDeliveryModal = lazy(() => import('./NewDeliveryModal'));
const DeliveryDetailModal = lazy(() => import('./DeliveryDetailModal'));
const CaptureScheduleModal = lazy(() => import('./CaptureScheduleModal'));

// Interfaces
interface KanbanProps {
  userProject: UserProjectData;
}

interface Column {
  id: string;
  title: string;
  statuses: string[];
  description: string;
}

const ALL_COLUMNS: Column[] = [
  { id: 'queue',      title: 'NA FILA',    statuses: ['queue'],        description: 'Aguardando editor disponível' },
  { id: 'todo',       title: 'A FAZER',    statuses: ['pending'],      description: 'Aguardando início' },
  { id: 'production', title: 'PRODUÇÃO',   statuses: ['in_progress'],  description: 'Editor produzindo' },
  { id: 'revision',   title: 'EM REVISÃO', statuses: ['revision'],     description: 'Editor revisando' },
  { id: 'review',     title: 'REVISAR',    statuses: ['review'],       description: 'Pronto para aprovação' },
  { id: 'done',       title: 'CONCLUÍDO',  statuses: ['approved'],     description: 'Aprovado e finalizado' },
];

const PAGE_SIZE = 20;

const Kanban = ({ userProject }: KanbanProps) => {
  const { deliveries, isLoading, refetch } = useDeliveries(userProject.id);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeColumn, setActiveColumn] = useState(() =>
    userProject.client_type === 'subscription' ? 'queue' : 'todo'
  );
  const [hasScheduledCapture, setHasScheduledCapture] = useState(false);
  const [captureLeadDays, setCaptureLeadDays] = useState(30);
  const [captureCheckDone, setCaptureCheckDone] = useState(false);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('preferred_view_client') as ViewMode) || 'kanban'
  );

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('preferred_view_client', v);
  };

  const isSubscription = userProject.client_type === 'subscription';

  const COLUMNS = useMemo(() => {
    return ALL_COLUMNS.filter((col) => {
      if (col.id !== 'queue') return true;
      if (isSubscription) return true;
      return deliveries.some((d) => d.status === 'queue');
    });
  }, [isSubscription, deliveries]);

  const requiresCapture = userProject.custom_project?.include_capture ?? false;
  const checkCapture = useCallback(async () => {
    if (!requiresCapture) {
      setCaptureCheckDone(true);
      return;
    }

    setCaptureLeadDays(userProject.custom_project?.capture_lead_days ?? 30);

    const { data: captures } = await supabase
      .from('capture_sessions')
      .select('id')
      .eq('user_project_id', userProject.id)
      .in('status', ['scheduled', 'confirmed', 'completed'])
      .gte('scheduled_date', userProject.current_period_start)
      .lte('scheduled_date', userProject.current_period_end)
      .limit(1);

    setHasScheduledCapture(!!captures && captures.length > 0);
    setCaptureCheckDone(true);
  }, [requiresCapture, userProject.id, userProject.current_period_start, userProject.current_period_end]);

  useEffect(() => {
    checkCapture();
  }, [checkCapture]);

  const hasQuota = useCallback(() => {
    const isSubscription = userProject.client_type === 'subscription';
    if (isSubscription) {
      const used = (userProject.instagram_reserved ?? 0) + (userProject.instagram_approved ?? 0);
      const total = (userProject as any).monthly_quota ?? 0;
      return used < total;
    }
    const p = userProject.custom_project;
    if (!p) return false;
    const ytUsed = (userProject.youtube_reserved ?? 0) + (userProject.youtube_approved ?? 0);
    if (p.youtube_videos > 0 && ytUsed < p.youtube_videos) return true;
    const igUsed = (userProject.instagram_reserved ?? 0) + (userProject.instagram_approved ?? 0);
    if (p.instagram_videos > 0 && igUsed < p.instagram_videos) return true;
    return false;
  }, [userProject]);

  const quotaAvailable = hasQuota();
  const canCreateDelivery = quotaAvailable && (!requiresCapture || hasScheduledCapture);
  const needsCaptureFirst = requiresCapture && !hasScheduledCapture && captureCheckDone;

  const handleNewClick = () => {
    if (needsCaptureFirst) {
      setShowCaptureModal(true);
    } else {
      setShowNewModal(true);
    }
  };

  const getDeliveriesForColumn = (col: Column) =>
    deliveries.filter((d) => col.statuses.includes(d.status));

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Capture banner component
  const CaptureBanner = () => {
    if (!needsCaptureFirst) return null;
    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-yellow-500/30 bg-yellow-500/5 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/15">
          <Camera className="h-4 w-4 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground">
            Agende sua captação primeiro
          </p>
          <p className="text-xs text-muted-foreground">
            Seu plano inclui captação presencial. Agende uma data para liberar as entregas deste mês.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
          onClick={() => setShowCaptureModal(true)}
        >
          <Camera className="h-3.5 w-3.5" />
          Agendar
        </Button>
      </div>
    );
  };

  // Mobile: segmented control with single column view
  if (isMobile) {
    const currentCol = COLUMNS.find(c => c.id === activeColumn) || COLUMNS[0];
    const items = getDeliveriesForColumn(currentCol);

    return (
      <div className="space-y-3">
        {/* Capture Banner */}
        <CaptureBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-sans font-semibold text-foreground">Entregas</h2>
          <div className="flex items-center gap-2">
            <ViewToggle value={viewMode} onChange={handleViewChange} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled={!canCreateDelivery}
                    className="gap-1.5 h-9 bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light"
                    onClick={handleNewClick}
                    data-tour="new-delivery-btn"
                  >
                    {needsCaptureFirst ? <Camera className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {needsCaptureFirst ? 'Agendar' : 'Nova'}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCreateDelivery && !needsCaptureFirst && (
                <TooltipContent>
                  <p>Você atingiu o limite de entregas do seu plano. Faça upgrade para continuar.</p>
                </TooltipContent>
              )}
              {needsCaptureFirst && (
                <TooltipContent>
                  <p>Agende uma captação para liberar entregas</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* Column Tabs */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex gap-2 p-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="flex-1 h-8 rounded-full" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[20px] bg-abba-surface border border-white/8 p-3 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <DeliveryListView
            deliveries={deliveries}
            onSelect={setSelectedDelivery}
            role="client"
          />
        ) : viewMode === 'calendar' ? (
          <DeliveryCalendarView
            deliveries={deliveries}
            onSelect={setSelectedDelivery}
          />
        ) : (
          <>
            <div className="flex gap-2 p-1" data-tour="kanban-board">
              {COLUMNS.map((col) => {
                const count = getDeliveriesForColumn(col).length;
                const isActive = activeColumn === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveColumn(col.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-full text-[11px] font-sans font-semibold tracking-wide transition-colors ${
                      isActive
                        ? 'bg-abba-surface text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {col.title}
                    {count > 0 && (
                      <span className={`text-[9px] ${isActive ? 'text-abba-lime' : 'text-white/50'}`}>
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
                <div className="rounded-[20px] bg-abba-surface/40 border border-white/6 p-8 text-center space-y-3">
                  <Video className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs font-sans text-muted-foreground">
                    Nenhuma entrega aqui
                  </p>
                  {activeColumn === 'todo' && canCreateDelivery && (
                    <Button size="sm" variant="outline" onClick={handleNewClick} className="text-xs rounded-full">
                      <Plus className="h-3 w-3 mr-1" />
                      Criar primeira entrega
                    </Button>
                  )}
                </div>
              ) : (
                items.map((d, idx) => (
                  <div key={d.id} className="relative" {...(idx === 0 ? { 'data-tour': 'delivery-card' } : {})}>
                    {activeColumn === 'queue' && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary" className="text-[9px] font-sans gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Aguardando editor
                        </Badge>
                      </div>
                    )}
                    <DeliveryCard
                      delivery={d}
                      onClick={() => setSelectedDelivery(d)}
                    />
                  </div>
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
            onUpdated={refetch}
            userProject={userProject}
          />
          {showNewModal && (
            <NewDeliveryModal
              open={showNewModal}
              onOpenChange={setShowNewModal}
              userProject={userProject}
              onCreated={refetch}
            />
          )}
          {showCaptureModal && (
            <CaptureScheduleModal
              open={showCaptureModal}
              onOpenChange={setShowCaptureModal}
              userProject={userProject}
              onScheduled={checkCapture}
              captureLeadDays={captureLeadDays}
            />
          )}
        </Suspense>
      </div>
    );
  }

  // Desktop: original 4-column grid
  return (
    <div className="space-y-4">
      {/* Capture Banner */}
      <CaptureBanner />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-sans font-semibold text-foreground">Minhas Entregas</h2>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={handleViewChange} />
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  disabled={!canCreateDelivery}
                  className="gap-1.5 bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light"
                  onClick={handleNewClick}
                  data-tour="new-delivery-btn"
                >
                  {needsCaptureFirst ? <Camera className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {needsCaptureFirst ? 'Agendar Captação' : 'Nova Solicitação'}
                </Button>
              </span>
            </TooltipTrigger>
            {!canCreateDelivery && !needsCaptureFirst && (
              <TooltipContent>
                <p>Você atingiu o limite de entregas do seu plano. Faça upgrade para continuar.</p>
              </TooltipContent>
            )}
            {needsCaptureFirst && (
              <TooltipContent>
                <p>Agende uma captação para liberar entregas</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {ALL_COLUMNS.filter(c => c.id !== 'queue' || isSubscription).map((c) => (
            <div key={c.id} className="rounded-[20px] bg-abba-surface/40 border border-white/6 p-2.5 min-w-[240px] space-y-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[20px] bg-abba-surface border border-white/8 p-3 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <DeliveryListView
          deliveries={deliveries}
          onSelect={setSelectedDelivery}
          role="client"
        />
      ) : viewMode === 'calendar' ? (
        <DeliveryCalendarView
          deliveries={deliveries}
          onSelect={setSelectedDelivery}
        />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3" data-tour="kanban-board">
          {COLUMNS.map((col) => {
            const allItems = getDeliveriesForColumn(col);
            const items = allItems.slice(0, visibleCount);
            const hasMore = allItems.length > visibleCount;
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-[20px] bg-abba-surface/40 border border-white/6 p-2"
                {...(col.id === 'review' ? { 'data-tour': 'kanban-review' } : {})}
              >
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-sans font-semibold uppercase tracking-widest text-muted-foreground">
                      {col.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] justify-center px-1.5 text-[10px] font-sans"
                    >
                      {allItems.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">{col.description}</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-0.5">
                    {items.length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <Video className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                        <p className="text-[10px] font-sans text-muted-foreground/50">Nenhuma entrega aqui</p>
                        {col.id === 'todo' && canCreateDelivery && (
                          <Button size="sm" variant="outline" onClick={handleNewClick} className="text-xs rounded-full">
                            <Plus className="h-3 w-3 mr-1" />
                            Criar primeira entrega
                          </Button>
                        )}
                      </div>
                    ) : (
                      items.map((d) => (
                        <div key={d.id} className="relative">
                          {col.id === 'queue' && (
                            <div className="absolute top-2 right-2 z-10">
                              <Badge variant="secondary" className="text-[9px] font-sans gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Aguardando editor
                              </Badge>
                            </div>
                          )}
                          <DeliveryCard
                            delivery={d}
                            onClick={() => setSelectedDelivery(d)}
                          />
                        </div>
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
          onUpdated={refetch}
          userProject={userProject}
        />
        {showNewModal && (
          <NewDeliveryModal
            open={showNewModal}
            onOpenChange={setShowNewModal}
            userProject={userProject}
            onCreated={refetch}
          />
        )}
        {showCaptureModal && (
          <CaptureScheduleModal
            open={showCaptureModal}
            onOpenChange={setShowCaptureModal}
            userProject={userProject}
            onScheduled={checkCapture}
            captureLeadDays={captureLeadDays}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Kanban;

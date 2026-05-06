// 🎨 Design system: ver DESIGN_SYSTEM.md na raiz do projeto.
// Regras: cards p-4, text-sm para labels, ícones h-4 w-4, banners compactos em 1 linha.
import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { Plus, Camera, AlertCircle, Video, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { Skeleton } from '@/components/ui/skeleton';
import DeliveryCard, { type DeliveryData } from './DeliveryCard';
import { useDeliveries } from '@/hooks/useDeliveries';
import { computeMonthlyQuota } from '@/lib/business-hours';
import type { UserProjectData } from '@/hooks/useUserProject';

import ViewToggle, { type ViewMode } from '@/components/shared/ViewToggle';
import DeliveryListView from '@/components/shared/DeliveryListView';
import DeliveryCalendarView from '@/components/shared/DeliveryCalendarView';
import KanbanBoard, { type KanbanColumn } from '@/components/shared/KanbanBoard';

const NewDeliveryModal = lazy(() => import('./NewDeliveryModal'));
const DeliveryDetailModal = lazy(() => import('./DeliveryDetailModal'));
const CaptureScheduleModal = lazy(() => import('./CaptureScheduleModal'));

// Interfaces
interface KanbanProps {
  userProject: UserProjectData;
  mockDeliveries?: DeliveryData[];
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

const Kanban = ({ userProject, mockDeliveries }: KanbanProps) => {
  const { deliveries: hookDeliveries, isLoading: hookLoading, refetch } = useDeliveries(userProject.id);
  const deliveries = mockDeliveries ?? hookDeliveries;
  const isLoading = mockDeliveries ? false : hookLoading;
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [hasScheduledCapture, setHasScheduledCapture] = useState(false);
  const [captureLeadDays, setCaptureLeadDays] = useState(30);
  const [captureCheckDone, setCaptureCheckDone] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('preferred_view_client') as ViewMode) || 'kanban'
  );

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('preferred_view_client', v);
  };

  const isSubscription = userProject.client_type === 'subscription' || userProject.client_type === 'influencer';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- capture_lead_days rarely changes and including it would cause unnecessary re-renders
  }, [requiresCapture, userProject.id, userProject.current_period_start, userProject.current_period_end]);

  useEffect(() => {
    checkCapture();
  }, [checkCapture]);

  const hasQuota = useCallback(() => {
    const isSub = userProject.client_type === 'subscription' || userProject.client_type === 'influencer';
    if (isSub) {
      // Subscription/influencer: always allow — no hard quota shown to client
      return true;
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


  // Capture banner component
  const CaptureBanner = () => {
    if (!needsCaptureFirst) return null;
    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-border bg-secondary/50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Camera className="h-4 w-4 text-foreground" />
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
          className="shrink-0 gap-1.5 border-border text-foreground hover:bg-secondary"
          onClick={() => setShowCaptureModal(true)}
        >
          <Camera className="h-3.5 w-3.5" />
          Agendar
        </Button>
      </div>
    );
  };

  // Unified layout
  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* HEADER */}
      <div className="shrink-0 space-y-4 px-0 pb-4">
        <CaptureBanner />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-sans font-semibold text-foreground">Minhas Entregas</h2>
          <div className="flex items-center gap-3">
            <ViewToggle value={viewMode} onChange={handleViewChange} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled={!canCreateDelivery}
                    className="gap-1.5 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90"
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
      </div>

      {/* SCROLL WRAPPER */}
      <div className="flex-1 min-h-0 w-full">
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {ALL_COLUMNS.filter(c => c.id !== 'queue' || isSubscription).map((c) => (
              <div key={c.id} className="rounded-[20px] bg-secondary/40 border border-border p-2.5 min-w-[240px] space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-5 rounded-md" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-[20px] bg-secondary border border-border p-3 space-y-2">
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
          <KanbanBoard<DeliveryData>
            columns={COLUMNS}
            items={deliveries}
            canDragBetweenColumns={false}
            dataTour="kanban-board"
            renderCard={(d) => (
              <div className="relative w-full min-w-0 overflow-hidden" data-tour={d.status === 'pending' ? 'delivery-card' : undefined}>
                <DeliveryCard
                  delivery={d}
                  onClick={() => setSelectedDelivery(d)}
                  clientType={userProject.client_type}
                />
              </div>
            )}
            renderEmpty={(col, hasAnyItems) => (
              <div className="py-8 text-center space-y-3">
                <Video className="h-6 w-6 text-muted-foreground/30 mx-auto" />
                {!hasAnyItems && col.statuses.includes('pending') ? (
                  <>
                    <p className="text-sm font-sans font-medium text-muted-foreground">Você ainda não tem entregas</p>
                    <p className="text-[10px] text-muted-foreground/60">Clique em "+ Nova Solicitação" para começar!</p>
                    {canCreateDelivery && (
                      <Button size="sm" variant="outline" onClick={handleNewClick} className="text-xs rounded-full">
                        <Plus className="h-3 w-3 mr-1" />
                        Nova Entrega
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] font-sans text-muted-foreground/50">Nenhuma entrega aqui</p>
                )}
              </div>
            )}
          />
        )}
      </div>

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

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { remainingBusinessMinutes, formatBusinessCountdown } from '@/lib/business-hours';
import { ptBR } from 'date-fns/locale';
import {
  Play,
  LogOut,
  Video,
  Camera,
  Image,
  Layers,
  Clock,
  Filter,
  GripVertical,
  ChevronDown,
  AlertTriangle,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useEditor } from '@/hooks/useEditor';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import EditorBriefingModal from '@/components/editor/EditorBriefingModal';
import NotificationBell from '@/components/shared/NotificationBell';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';

/* ─── Types ─── */
interface EditorDelivery extends DeliveryData {
  client_name: string | null;
  client_avatar: string | null;
  brand_colors: string[];
  logo_url: string | null;
}

interface SubscriptionQueueItem {
  id: string;
  title: string;
  delivery_type: string;
  status: string;
  created_at: string;
  due_date: string | null;
  priority_level: number | null;
  client_name: string | null;
  subscription_tier: string | null;
  sla_hours: number | null;
}

interface Column {
  id: string;
  title: string;
  statuses: string[];
  description: string;
  editorCanDrop: boolean;
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'A FAZER', statuses: ['pending'], description: 'Aguardando início', editorCanDrop: true },
  { id: 'production', title: 'EM PRODUÇÃO', statuses: ['in_progress'], description: 'Em andamento', editorCanDrop: true },
  { id: 'review', title: 'REVISAR', statuses: ['review'], description: 'Aguardando aprovação do cliente', editorCanDrop: true },
  { id: 'done', title: 'CONCLUÍDO', statuses: ['approved'], description: 'Aprovado pelo cliente', editorCanDrop: false },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube_video: Video,
  instagram_video: Camera,
  thumbnail: Image,
  cover: Layers,
};

const typeLabels: Record<string, string> = {
  youtube_video: 'YouTube',
  instagram_video: 'Instagram',
  thumbnail: 'Thumbnail',
  cover: 'Capa',
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  5: { label: 'Agência', color: 'bg-purple-700 text-white' },
  4: { label: 'Premium', color: 'bg-blue-600 text-white' },
  3: { label: 'Business', color: 'bg-emerald-600 text-white' },
  2: { label: 'Pro', color: 'bg-yellow-500 text-black' },
  1: { label: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const getDeadlineInfo = (dueDate: string | null) => {
  if (!dueDate) return { hours: null, color: 'text-muted-foreground', label: 'Sem prazo' };
  const bizMin = remainingBusinessMinutes(new Date(dueDate));
  const bizHours = bizMin / 60;
  const label = formatBusinessCountdown(bizMin);
  if (bizMin < 0) return { hours: bizHours, color: 'text-destructive', label: 'Atrasado' };
  if (bizHours <= 6) return { hours: bizHours, color: 'text-destructive', label };
  if (bizHours <= 12) return { hours: bizHours, color: 'text-[hsl(45,93%,47%)]', label };
  return { hours: bizHours, color: 'text-primary', label };
};

/* ─── Subscription Queue Card ─── */
const SubscriptionQueueCard = ({ item }: { item: SubscriptionQueueItem }) => {
  const Icon = typeIcons[item.delivery_type] || Video;
  const priority = PRIORITY_CONFIG[item.priority_level ?? 1] || PRIORITY_CONFIG[1];
  const isInProgress = item.status === 'in_progress';

  return (
    <Card className="border-border/40 bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Priority badge */}
        <Badge className={`shrink-0 text-[10px] font-bold px-2 py-0.5 ${priority.color}`}>
          P{item.priority_level ?? 1}
        </Badge>

        {/* Icon */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-card-foreground line-clamp-1">
            {item.title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground truncate">
              {item.client_name || '—'} · {item.subscription_tier || priority.label}
            </p>
            {/* SLA Countdown for in-progress items */}
            {isInProgress && item.due_date && item.sla_hours && (
              <SlaCountdown slaDeadline={item.due_date} slaHours={item.sla_hours} />
            )}
          </div>
        </div>

        {/* Status */}
        {isInProgress ? (
          <Badge variant="default" className="shrink-0 bg-emerald-600 text-[10px] text-white">
            EM PRODUÇÃO
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            NA FILA
          </Badge>
        )}
      </div>
    </Card>
  );
};

/* ─── Editor Card ─── */
const EditorDeliveryCard = ({
  delivery,
  onClick,
  onDragStart,
  isDragging,
}: {
  delivery: EditorDelivery;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}) => {
  const Icon = typeIcons[delivery.delivery_type] || Video;
  const deadline = getDeadlineInfo(delivery.due_date);

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={(e) => {
        if (!onDragStart) return;
        const el = e.currentTarget.cloneNode(true) as HTMLElement;
        el.style.width = `${e.currentTarget.offsetWidth}px`;
        el.style.opacity = '0.9';
        el.style.transform = 'rotate(2deg)';
        el.style.position = 'absolute';
        el.style.top = '-9999px';
        document.body.appendChild(el);
        e.dataTransfer.setDragImage(el, 20, 20);
        setTimeout(() => document.body.removeChild(el), 0);
        onDragStart(e);
      }}
      onClick={onClick}
      className={`cursor-pointer border-border/40 bg-card p-3 transition-all hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.08)] active:bg-muted/50 ${
        isDragging ? 'opacity-30 scale-95' : ''
      } ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {onDragStart && <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-card-foreground line-clamp-2">
            {delivery.title}
          </p>
        </div>
      </div>

      {/* Client */}
      <p className={`mt-1.5 text-[11px] text-muted-foreground truncate ${onDragStart ? 'pl-[42px]' : 'pl-8'}`}>
        {delivery.client_name || '—'}
      </p>

      {/* Brand colors */}
      {(delivery.brand_colors.length > 0 || delivery.logo_url) && (
        <div className={`mt-2 flex items-center gap-1.5 ${onDragStart ? 'pl-[42px]' : 'pl-8'}`}>
          {delivery.brand_colors.slice(0, 3).map((c, i) => (
            <div key={i} className="h-3.5 w-3.5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
          ))}
          {delivery.logo_url && <img src={delivery.logo_url} alt="" className="h-3.5 w-3.5 rounded object-contain" />}
        </div>
      )}

      {/* Deadline */}
      {delivery.due_date && (
        <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${onDragStart ? 'pl-[42px]' : 'pl-8'}`}>
          <Clock className={`h-3 w-3 shrink-0 ${deadline.color}`} />
          <span className="text-muted-foreground">
            {format(new Date(delivery.due_date), "dd/MM 'às' HH'h'", { locale: ptBR })}
          </span>
          <span className={`ml-auto text-[10px] font-medium ${deadline.color}`}>
            {deadline.label}
          </span>
        </div>
      )}
    </Card>
  );
};

/* ─── Filters component ─── */
const FilterControls = ({
  clientFilter, setClientFilter, typeFilter, setTypeFilter, lateOnly, setLateOnly,
  uniqueClients, uniqueTypes,
}: {
  clientFilter: string; setClientFilter: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  lateOnly: boolean; setLateOnly: (v: boolean) => void;
  uniqueClients: string[]; uniqueTypes: string[];
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Cliente</label>
      <Select value={clientFilter} onValueChange={setClientFilter}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {uniqueClients.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {uniqueTypes.map((t) => (
            <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center gap-2">
      <Checkbox id="late-filter" checked={lateOnly} onCheckedChange={(v) => setLateOnly(!!v)} />
      <label htmlFor="late-filter" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Apenas atrasadas
      </label>
    </div>
  </div>
);

/* ─── Main Dashboard ─── */
const EditorDashboard = () => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { editor, isLoading: editorLoading } = useEditor();
  const isMobile = useIsMobile();
  const [deliveries, setDeliveries] = useState<EditorDelivery[]>([]);
  const [subscriptionQueue, setSubscriptionQueue] = useState<SubscriptionQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState('todo');
  const [startingProduction, setStartingProduction] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filters
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lateOnly, setLateOnly] = useState(false);

  const activeFilterCount = [clientFilter !== 'all', typeFilter !== 'all', lateOnly].filter(Boolean).length;

  const fetchSubscriptionQueue = useCallback(async () => {
    if (!editor) return;

    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id, title, delivery_type, status, created_at, due_date, priority_level,
        user_project:user_projects!inner(
          user_id, client_type, subscription_tier, priority_level, sla_hours
        )
      `)
      .eq('editor_id', editor.id)
      .in('status', ['queue', 'in_progress'])
      .order('priority_level', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Filter to subscription client_type only
      const subItems = (data as any[]).filter((d) => d.user_project?.client_type === 'subscription');
      const userIds = [...new Set(subItems.map((d) => d.user_project?.user_id).filter(Boolean))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setSubscriptionQueue(
        subItems.map((d) => ({
          id: d.id,
          title: d.title,
          delivery_type: d.delivery_type,
          status: d.status,
          created_at: d.created_at,
          due_date: d.due_date,
          priority_level: d.priority_level ?? d.user_project?.priority_level ?? 1,
          client_name: profileMap.get(d.user_project?.user_id)?.full_name || null,
          subscription_tier: d.user_project?.subscription_tier || null,
          sla_hours: d.user_project?.sla_hours || null,
        }))
      );
    }
  }, [editor]);

  const fetchDeliveries = useCallback(async () => {
    if (!editor) return;
    setIsLoading(true);

    // Fetch both in parallel
    const [, deliveriesResult] = await Promise.all([
      fetchSubscriptionQueue(),
      supabase
        .from('deliveries')
        .select(`
          *,
          user_project:user_projects!inner(
            user_id,
            custom_project_id,
            custom_project:custom_projects(project_name)
          )
        `)
        .eq('editor_id', editor.id)
        .order('due_date', { ascending: true }),
    ]);

    const { data, error } = deliveriesResult;

    if (!error && data) {
      const userIds = [...new Set(data.map((d: any) => d.user_project?.user_id).filter(Boolean))];

      const [profilesRes, briefingsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        supabase.from('onboarding_briefings').select('user_id, brand_colors, logo_url, primary_color, secondary_color').in('user_id', userIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const briefingMap = new Map((briefingsRes.data || []).map((b: any) => [b.user_id, b]));

      setDeliveries(
        data.map((d: any) => {
          const userId = d.user_project?.user_id;
          const prof = profileMap.get(userId);
          const briefing = briefingMap.get(userId);
          const colors: string[] = [];
          if (briefing?.primary_color) colors.push(briefing.primary_color);
          if (briefing?.secondary_color) colors.push(briefing.secondary_color);
          if (Array.isArray(briefing?.brand_colors)) {
            for (const c of briefing.brand_colors) {
              if (typeof c === 'string' && !colors.includes(c)) colors.push(c);
            }
          }

          return {
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
            editor_name: editor.display_name,
            editor_id: d.editor_id,
            created_at: d.created_at,
            delivered_at: d.delivered_at,
            approved_at: d.approved_at,
            revision_notes: d.revision_notes,
            user_project_id: d.user_project_id,
            client_name: prof?.full_name || null,
            client_avatar: prof?.avatar_url || null,
            brand_colors: colors,
            logo_url: briefing?.logo_url || null,
          };
        }),
      );
    }
    setIsLoading(false);
  }, [editor, fetchSubscriptionQueue]);

  useEffect(() => {
    if (editor) fetchDeliveries();
  }, [editor, fetchDeliveries]);

  // Realtime
  useEffect(() => {
    if (!editor) return;
    const channel = supabase
      .channel(`editor-deliveries-${editor.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchDeliveries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [editor, fetchDeliveries]);

  // Filtered deliveries
  const filtered = useMemo(() => {
    let result = deliveries;
    if (clientFilter !== 'all') {
      result = result.filter((d) => d.client_name === clientFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((d) => d.delivery_type === typeFilter);
    }
    if (lateOnly) {
      result = result.filter((d) => {
        if (!d.due_date) return false;
        return remainingBusinessMinutes(new Date(d.due_date)) < 0;
      });
    }
    return result;
  }, [deliveries, clientFilter, typeFilter, lateOnly]);

  const pendingCount = deliveries.filter((d) => ['pending', 'in_progress', 'revision'].includes(d.status)).length;

  const uniqueClients = [...new Set(deliveries.map((d) => d.client_name).filter(Boolean))] as string[];
  const uniqueTypes = [...new Set(deliveries.map((d) => d.delivery_type))];

  // Subscription queue: count in-progress and start production
  const inProgressSubCount = subscriptionQueue.filter((d) => d.status === 'in_progress').length;
  const canStartProduction = inProgressSubCount < 2 && subscriptionQueue.some((d) => d.status === 'queue');

  const handleStartProduction = async () => {
    if (!canStartProduction) return;
    setStartingProduction(true);

    try {
      // Get next queue item (already sorted by priority_level DESC, created_at ASC)
      const nextItem = subscriptionQueue.find((d) => d.status === 'queue');
      if (!nextItem) return;

      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'in_progress' } as any)
        .eq('id', nextItem.id);

      if (error) {
        toast.error('Erro ao iniciar produção');
      } else {
        toast.success(`"${nextItem.title}" movido para produção`);
        fetchDeliveries();
      }
    } finally {
      setStartingProduction(false);
    }
  };

  // Drag and drop (desktop only)
  const handleDragStart = (deliveryId: string) => (e: React.DragEvent) => {
    setDraggedId(deliveryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (col: Column) => {
    if (!draggedId || !col.editorCanDrop) return;
    const delivery = deliveries.find((d) => d.id === draggedId);
    if (!delivery) return;

    const newStatus = col.statuses[0];
    if (delivery.status === newStatus) { setDraggedId(null); return; }

    const updateData: Record<string, any> = { status: newStatus };
    if (newStatus === 'review') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', draggedId);

    if (error) {
      toast.error('Erro ao mover entrega');
    } else {
      logger.info('Editor moveu entrega', { delivery_id: draggedId, to: col.title }, 'editor');
      toast.success(`Movido para ${col.title}`);
      fetchDeliveries();
    }
    setDraggedId(null);
  };

  const handleDragOver = (col: Column) => (e: React.DragEvent) => {
    if (col.editorCanDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (editorLoading || (!editor && !editorLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {editorLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <p className="text-muted-foreground">Perfil de editor não encontrado.</p>
        )}
      </div>
    );
  }

  /* ─── Mobile Layout ─── */
  if (isMobile) {
    const currentCol = COLUMNS.find((c) => c.id === activeColumn) || COLUMNS[0];
    const items = filtered.filter((d) => currentCol.statuses.includes(d.status));

    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg gradient-neon flex items-center justify-center">
                <Play className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {/* Filter sheet */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8">
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle className="text-left">Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <FilterControls
                      clientFilter={clientFilter} setClientFilter={setClientFilter}
                      typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                      lateOnly={lateOnly} setLateOnly={setLateOnly}
                      uniqueClients={uniqueClients} uniqueTypes={uniqueTypes}
                    />
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 w-full text-muted-foreground"
                        onClick={() => {
                          setClientFilter('all');
                          setTypeFilter('all');
                          setLateOnly(false);
                        }}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" /> Limpar filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 px-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-[10px] text-primary">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Column tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {COLUMNS.map((col) => {
              const count = filtered.filter((d) => col.statuses.includes(d.status)).length;
              const isActive = activeColumn === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveColumn(col.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[10px] font-mono font-medium tracking-wider transition-colors ${
                    isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {col.title.split(' ')[0]}
                  {count > 0 && (
                    <span className={`text-[9px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subscription Queue - Mobile */}
        {subscriptionQueue.length > 0 && (
          <div className="px-4 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fila de Produção
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  {subscriptionQueue.length}
                </Badge>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      className="h-7 text-[10px]"
                      disabled={!canStartProduction || startingProduction}
                      onClick={handleStartProduction}
                    >
                      {startingProduction ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Iniciar produção
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canStartProduction && (
                  <TooltipContent>
                    {inProgressSubCount >= 2
                      ? 'Limite de 2 produções simultâneas atingido'
                      : 'Nenhum item na fila'}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
            <div className="space-y-2">
              {subscriptionQueue.map((item) => (
                <SubscriptionQueueCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        <main className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-xs font-mono text-muted-foreground">Nenhuma entrega</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((d) => (
                <EditorDeliveryCard
                  key={d.id}
                  delivery={d}
                  onClick={() => setSelectedDelivery(d)}
                />
              ))}
            </div>
          )}
        </main>

        <EditorBriefingModal
          open={!!selectedDelivery}
          onOpenChange={() => setSelectedDelivery(null)}
          delivery={selectedDelivery}
          onUpdated={fetchDeliveries}
        />
      </div>
    );
  }

  /* ─── Desktop Layout ─── */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold">
              Abba<span className="text-primary">Video</span>
            </span>
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {uniqueClients.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {uniqueTypes.map((t) => (
                  <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 ml-1">
              <Checkbox
                id="late-only"
                checked={lateOnly}
                onCheckedChange={(v) => setLateOnly(!!v)}
              />
              <label htmlFor="late-only" className="text-[10px] text-muted-foreground cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Atrasadas
              </label>
            </div>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-1 gap-2 px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Subscription Queue - Desktop */}
      {subscriptionQueue.length > 0 && (
        <div className="px-4 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fila de Produção
            </h2>
            <Badge variant="secondary" className="text-xs">
              {subscriptionQueue.length} {subscriptionQueue.length === 1 ? 'item' : 'itens'}
            </Badge>
            <div className="ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={!canStartProduction || startingProduction}
                      onClick={handleStartProduction}
                    >
                      {startingProduction ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                      Iniciar produção
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canStartProduction && (
                  <TooltipContent>
                    {inProgressSubCount >= 2
                      ? 'Limite de 2 produções simultâneas atingido'
                      : 'Nenhum item na fila'}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 mb-4">
            {subscriptionQueue.map((item) => (
              <SubscriptionQueueCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban desktop */}
      <main className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {COLUMNS.map((c) => <Skeleton key={c.id} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {COLUMNS.map((col) => {
              const items = filtered.filter((d) => col.statuses.includes(d.status));
              return (
                <div
                  key={col.id}
                  className={`flex flex-col rounded-xl border p-2 transition-colors ${
                    draggedId && col.editorCanDrop
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/40 bg-muted/30'
                  }`}
                  onDragOver={handleDragOver(col)}
                  onDrop={() => handleDrop(col)}
                >
                  <div className="mb-2 px-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {col.title}
                      </h3>
                      <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]">
                        {items.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">{col.description}</p>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-2 p-0.5">
                      {items.length === 0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground/50">
                          Nenhuma entrega
                        </p>
                      ) : (
                        items.map((d) => (
                          <EditorDeliveryCard
                            key={d.id}
                            delivery={d}
                            isDragging={draggedId === d.id}
                            onClick={() => setSelectedDelivery(d)}
                            onDragStart={handleDragStart(d.id)}
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
      </main>

      <EditorBriefingModal
        open={!!selectedDelivery}
        onOpenChange={() => setSelectedDelivery(null)}
        delivery={selectedDelivery}
        onUpdated={fetchDeliveries}
      />
    </div>
  );
};

export default EditorDashboard;

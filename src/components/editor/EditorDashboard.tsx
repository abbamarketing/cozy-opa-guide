import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, differenceInHours } from 'date-fns';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useEditor } from '@/hooks/useEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';

/* ─── Types ─── */
interface EditorDelivery extends DeliveryData {
  client_name: string | null;
  client_avatar: string | null;
  brand_colors: string[];
  logo_url: string | null;
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

const getDeadlineInfo = (dueDate: string | null) => {
  if (!dueDate) return { hours: null, color: 'text-muted-foreground', label: 'Sem prazo' };
  const h = differenceInHours(new Date(dueDate), new Date());
  if (h < 0) return { hours: h, color: 'text-destructive', label: 'Atrasado' };
  if (h <= 6) return { hours: h, color: 'text-destructive', label: `${h}h restantes` };
  if (h <= 12) return { hours: h, color: 'text-[hsl(45,93%,47%)]', label: `${h}h restantes` };
  return { hours: h, color: 'text-primary', label: `${h}h restantes` };
};

/* ─── Editor Card ─── */
const EditorDeliveryCard = ({
  delivery,
  onClick,
  onDragStart,
}: {
  delivery: EditorDelivery;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) => {
  const Icon = typeIcons[delivery.delivery_type] || Video;
  const deadline = getDeadlineInfo(delivery.due_date);

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing border-border/40 bg-card/80 p-3 transition-all hover:border-border hover:bg-card space-y-2"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-card-foreground">{delivery.title}</p>
          <p className="text-xs text-muted-foreground">Cliente: {delivery.client_name || '—'}</p>
        </div>
      </div>

      {/* Brand preview */}
      {(delivery.brand_colors.length > 0 || delivery.logo_url) && (
        <div className="flex items-center gap-1.5">
          {delivery.brand_colors.slice(0, 3).map((c, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border border-border/50"
              style={{ backgroundColor: c }}
            />
          ))}
          {delivery.logo_url && (
            <img src={delivery.logo_url} alt="logo" className="h-4 w-4 rounded object-contain" />
          )}
        </div>
      )}

      {/* Deadline */}
      {delivery.due_date && (
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className={`h-3 w-3 ${deadline.color}`} />
          <span className="text-muted-foreground">
            {format(new Date(delivery.due_date), "dd/MM 'às' HH'h'", { locale: ptBR })}
          </span>
          <Badge variant="outline" className={`ml-auto text-[10px] px-1.5 py-0 ${deadline.color} border-0`}>
            {deadline.label}
          </Badge>
        </div>
      )}
    </Card>
  );
};

/* ─── Main Dashboard ─── */
const EditorDashboard = () => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { editor, isLoading: editorLoading } = useEditor();
  const [deliveries, setDeliveries] = useState<EditorDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Filters
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lateOnly, setLateOnly] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    if (!editor) return;
    setIsLoading(true);

    const { data, error } = await supabase
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
      .order('due_date', { ascending: true });

    if (!error && data) {
      // Fetch profiles and briefings for each unique user
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
  }, [editor]);

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
        return differenceInHours(new Date(d.due_date), new Date()) < 0;
      });
    }
    return result;
  }, [deliveries, clientFilter, typeFilter, lateOnly]);

  const pendingCount = deliveries.filter((d) => ['pending', 'in_progress', 'revision'].includes(d.status)).length;

  const uniqueClients = [...new Set(deliveries.map((d) => d.client_name).filter(Boolean))];
  const uniqueTypes = [...new Set(deliveries.map((d) => d.delivery_type))];
  const typeLabels: Record<string, string> = {
    youtube_video: 'YouTube',
    instagram_video: 'Instagram',
    thumbnail: 'Thumbnail',
    cover: 'Capa',
  };

  // Drag and drop
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
            {/* Filters */}
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {uniqueClients.map((c) => (
                  <SelectItem key={c} value={c!}>{c}</SelectItem>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2 gap-2 px-2">
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

      {/* Kanban */}
      <main className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {COLUMNS.map((c) => <Skeleton key={c.id} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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

      {/* Editor Briefing Modal */}
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

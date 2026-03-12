import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video, Camera, Image, Layers, Clock, GripVertical, MoreHorizontal, UserCheck, XCircle, Loader2, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSV } from '@/lib/csv';

interface AdminDelivery {
  id: string;
  title: string;
  status: string;
  delivery_type: string;
  due_date: string | null;
  editor_id: string | null;
  editor_name: string | null;
  client_name: string | null;
  user_project_id: string;
}

interface Editor {
  id: string;
  display_name: string;
}

const COLUMNS = [
  { id: 'todo', title: 'A FAZER', statuses: ['pending'] },
  { id: 'production', title: 'EM PRODUÇÃO', statuses: ['in_progress'] },
  { id: 'review', title: 'REVISAR', statuses: ['review', 'revision'] },
  { id: 'done', title: 'CONCLUÍDO', statuses: ['approved'] },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube_video: Video,
  instagram_video: Camera,
  thumbnail: Image,
  cover: Layers,
};

const AdminDeliveries = () => {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState('all');
  const [editorFilter, setEditorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [deliveriesRes, editorsRes] = await Promise.all([
      supabase
        .from('deliveries')
        .select(`*, user_project:user_projects!inner(user_id)`)
        .order('due_date', { ascending: true }),
      supabase.from('editors').select('id, display_name'),
    ]);

    const editorsList = (editorsRes.data || []) as Editor[];
    setEditors(editorsList);
    const editorMap = new Map(editorsList.map((e) => [e.id, e.display_name]));

    if (deliveriesRes.data) {
      const userIds = [...new Set(deliveriesRes.data.map((d: any) => d.user_project?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      setDeliveries(
        deliveriesRes.data.map((d: any) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          delivery_type: d.delivery_type,
          due_date: d.due_date,
          editor_id: d.editor_id,
          editor_name: d.editor_id ? editorMap.get(d.editor_id) || null : null,
          client_name: profileMap.get(d.user_project?.user_id) || null,
          user_project_id: d.user_project_id,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = deliveries;
    if (clientFilter !== 'all') result = result.filter((d) => d.client_name === clientFilter);
    if (editorFilter !== 'all') result = result.filter((d) => d.editor_id === editorFilter);
    if (typeFilter !== 'all') result = result.filter((d) => d.delivery_type === typeFilter);
    return result;
  }, [deliveries, clientFilter, editorFilter, typeFilter]);

  const uniqueClients = [...new Set(deliveries.map((d) => d.client_name).filter(Boolean))];

  const handleDrop = async (colStatuses: string[]) => {
    if (!draggedId) return;
    const newStatus = colStatuses[0];
    const { error } = await supabase
      .from('deliveries')
      .update({ status: newStatus } as any)
      .eq('id', draggedId);

    if (error) toast.error('Erro ao mover');
    else { toast.success('Status atualizado'); fetchData(); }
    setDraggedId(null);
  };

  const handleReassign = async (deliveryId: string, editorId: string) => {
    setActionLoading(deliveryId);
    const { error } = await supabase
      .from('deliveries')
      .update({ editor_id: editorId } as any)
      .eq('id', deliveryId);

    if (error) toast.error('Erro ao reatribuir');
    else { toast.success('Editor reatribuído'); fetchData(); }
    setActionLoading(null);
  };

  const handleCancel = async (deliveryId: string) => {
    setActionLoading(deliveryId);
    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'cancelled' } as any)
      .eq('id', deliveryId);

    if (error) toast.error('Erro ao cancelar');
    else { toast.success('Entrega cancelada'); fetchData(); }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {COLUMNS.map((c) => <Skeleton key={c.id} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {uniqueClients.map((c) => (
              <SelectItem key={c} value={c!}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={editorFilter} onValueChange={setEditorFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Editor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos editores</SelectItem>
            {editors.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="youtube_video">YouTube</SelectItem>
            <SelectItem value="instagram_video">Instagram</SelectItem>
            <SelectItem value="thumbnail">Thumbnail</SelectItem>
            <SelectItem value="cover">Capa</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          disabled={filtered.length === 0}
          onClick={() => {
            const typeLabels: Record<string, string> = {
              youtube_video: 'YouTube', instagram_video: 'Instagram', thumbnail: 'Thumbnail', cover: 'Capa',
            };
            const statusLabels: Record<string, string> = {
              pending: 'Pendente', in_progress: 'Em produção', review: 'Revisão', revision: 'Revisão solicitada', approved: 'Aprovado', cancelled: 'Cancelado',
            };
            downloadCSV(
              filtered.map((d) => ({
                Título: d.title,
                Tipo: typeLabels[d.delivery_type] || d.delivery_type,
                Status: statusLabels[d.status] || d.status,
                Cliente: d.client_name || '—',
                Editor: d.editor_name || 'Sem editor',
                Prazo: d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—',
              })),
              `entregas-${format(new Date(), 'yyyy-MM-dd')}`
            );
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const items = filtered.filter((d) => col.statuses.includes(d.status));
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border p-2 transition-colors ${
                draggedId ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={() => handleDrop(col.statuses)}
            >
              <div className="mb-2 px-1 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.title}
                </h3>
                <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]">
                  {items.length}
                </Badge>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 p-0.5">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground/50">Nenhuma</p>
                  ) : (
                    items.map((d) => {
                      const Icon = typeIcons[d.delivery_type] || Video;
                      const h = d.due_date ? differenceInHours(new Date(d.due_date), new Date()) : null;
                      return (
                        <Card
                          key={d.id}
                          draggable
                          onDragStart={() => setDraggedId(d.id)}
                          className="cursor-grab active:cursor-grabbing border-border/40 bg-card/80 p-3 space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-card-foreground">{d.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {d.client_name || '—'} · {d.editor_name || 'Sem editor'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={actionLoading === d.id}>
                                  {actionLoading === d.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {editors.map((e) => (
                                  <DropdownMenuItem key={e.id} onClick={() => handleReassign(d.id, e.id)}>
                                    <UserCheck className="mr-2 h-3.5 w-3.5" /> {e.display_name}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onClick={() => handleCancel(d.id)} className="text-destructive">
                                  <XCircle className="mr-2 h-3.5 w-3.5" /> Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {d.due_date && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <Clock className={`h-3 w-3 ${h !== null && h < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <span className="text-muted-foreground">
                                {format(new Date(d.due_date), "dd/MM HH'h'", { locale: ptBR })}
                              </span>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDeliveries;

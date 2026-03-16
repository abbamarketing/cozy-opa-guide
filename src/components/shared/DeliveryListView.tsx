import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Camera, Image, Layers, Clock, AlertTriangle, ShieldAlert, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { remainingBusinessMinutes, formatBusinessCountdown } from '@/lib/business-hours';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';
import { statusConfig } from '@/components/dashboard/DeliveryCard';

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  youtube_video: { icon: Video, label: 'YouTube' },
  instagram_video: { icon: Camera, label: 'Instagram' },
  thumbnail: { icon: Image, label: 'Thumbnail' },
  cover: { icon: Layers, label: 'Capa' },
};

type SortField = 'title' | 'delivery_type' | 'status' | 'person' | 'due_date';
type SortDir = 'asc' | 'desc';

interface DeliveryListViewProps {
  deliveries: DeliveryData[];
  onSelect: (delivery: DeliveryData) => void;
  /** 'client' shows editor_name, 'editor'/'admin' shows client_name */
  role: 'client' | 'editor' | 'admin';
  /** For editor/admin: client name mapped by delivery id. Required when role !== 'client'. */
  clientNames?: Record<string, string | null>;
  /** Whether clientNames is still loading */
  isLoadingClientNames?: boolean;
  /** Show skeleton loading state */
  isLoading?: boolean;
}

function getSlaLevel(dueDate: string | null): { label: string; level: 'ok' | 'warning' | 'danger' | 'overdue' | 'none'; icon?: 'alert' | 'shield' } {
  if (!dueDate) return { label: '—', level: 'none' };
  const bizMin = remainingBusinessMinutes(new Date(dueDate));
  const countdown = formatBusinessCountdown(bizMin);
  if (bizMin < 0) return { label: countdown, level: 'overdue', icon: 'shield' };
  if (bizMin <= 360) return { label: countdown, level: 'danger', icon: 'alert' };
  if (bizMin <= 720) return { label: countdown, level: 'warning', icon: 'alert' };
  return { label: countdown, level: 'ok' };
}

const slaBadgeClass: Record<string, string> = {
  ok: 'bg-[hsl(var(--queue-green))]/15 text-[hsl(var(--queue-green))] border-[hsl(var(--queue-green))]/30',
  warning: 'bg-[hsl(var(--queue-yellow))]/15 text-[hsl(var(--queue-yellow))] border-[hsl(var(--queue-yellow))]/30',
  danger: 'bg-destructive/15 text-destructive border-destructive/30',
  overdue: 'bg-destructive/15 text-destructive border-destructive/30',
  none: 'bg-muted text-muted-foreground border-border',
};

const PAGE_SIZE = 20;

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
};

const DeliveryListView = ({ deliveries, onSelect, role, clientNames, isLoadingClientNames, isLoading }: DeliveryListViewProps) => {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const personLabel = role === 'client' ? 'Editor' : 'Cliente';

  const isClientNamesLoading = (role === 'editor' || role === 'admin') && (isLoadingClientNames || !clientNames);

  const getPersonName = (d: DeliveryData) => {
    if (role === 'client') return d.editor_name || '—';
    if (isClientNamesLoading) return null; // signal to render skeleton
    return clientNames?.[d.id] || '—';
  };

  const sorted = useMemo(() => {
    const arr = [...deliveries];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'delivery_type': cmp = a.delivery_type.localeCompare(b.delivery_type); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'person': cmp = (getPersonName(a) || '').localeCompare(getPersonName(b) || ''); break;
        case 'due_date': {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          cmp = da - db;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [deliveries, sortField, sortDir, clientNames]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="rounded-[20px] bg-abba-surface/40 border border-white/6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/6 hover:bg-transparent">
              {['Título', 'Tipo', 'Status', personLabel, 'Prazo SLA'].map((h) => (
                <TableHead key={h}><span className="text-[10px] uppercase tracking-widest font-semibold">{h}</span></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i} className="border-white/6">
                <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-[20px] bg-abba-surface/40 border border-white/6 p-8 text-center">
        <Video className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Nenhuma entrega encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] bg-abba-surface/40 border border-white/6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/6 hover:bg-transparent">
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('title')}>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold">
                  Título <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none w-[100px]" onClick={() => handleSort('delivery_type')}>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold">
                  Tipo <SortIcon field="delivery_type" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none w-[110px]" onClick={() => handleSort('status')}>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold">
                  Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none w-[120px]" onClick={() => handleSort('person')}>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold">
                  {personLabel} <SortIcon field="person" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none w-[140px]" onClick={() => handleSort('due_date')}>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold">
                  Prazo SLA <SortIcon field="due_date" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => {
              const type = typeConfig[d.delivery_type] || typeConfig.youtube_video;
              const Icon = type.icon;
              const status = statusConfig[d.status] || statusConfig.pending;
              const isCompleted = d.status === 'approved' || d.status === 'cancelled';
              const sla = isCompleted ? { label: '—', level: 'none' as const } : getSlaLevel(d.due_date);

              return (
                <TableRow
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="cursor-pointer border-white/6 hover:bg-white/[0.03] transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-sm font-medium truncate">{d.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{type.label}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {getPersonName(d) === null ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{getPersonName(d)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.due_date && !isCompleted ? (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">
                          {format(new Date(d.due_date), "dd/MM HH'h'", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 inline-flex items-center gap-0.5 ${slaBadgeClass[sla.level]}`}>
                          {sla.icon === 'shield' && <ShieldAlert className="h-2.5 w-2.5" />}
                          {sla.icon === 'alert' && <AlertTriangle className="h-2.5 w-2.5" />}
                          {sla.label}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};

export default DeliveryListView;

import { useState, useMemo, useEffect } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Package, Camera, Pin,
  Loader2, CalendarIcon, Trash2, Pencil, Clapperboard, MapPin, Users, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* ───── Types ───── */
interface CalendarEventRaw {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  related_editor_id: string | null;
  status?: string;
  delivery_type?: string;
  client_name?: string;
  location_name?: string;
  [key: string]: unknown;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  type: 'delivery' | 'capture' | 'manual';
  color: string;
  raw: CalendarEventRaw;
}

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const EVENT_TYPES = [
  { value: 'gravacao', label: 'Gravação', icon: Clapperboard },
  { value: 'captacao_externa', label: 'Captação Externa', icon: MapPin },
  { value: 'sessao_cliente', label: 'Sessão com Cliente', icon: Users },
  { value: 'revisao_ao_vivo', label: 'Revisão ao Vivo', icon: RefreshCw },
];

/* colour classes */
const deliveryColor = 'bg-primary/15 border-primary/30 text-primary';
const captureColor  = 'bg-[hsl(var(--queue-green))]/20 border-[hsl(var(--queue-green))]/40 text-[hsl(var(--queue-green))]';

const MANUAL_TYPE_COLORS: Record<string, string> = {
  gravacao: 'bg-primary/20 border-primary/40 text-primary',
  captacao_externa: 'bg-destructive/20 border-destructive/40 text-destructive',
  sessao_cliente: 'bg-foreground/10 border-foreground/20 text-foreground',
  revisao_ao_vivo: 'bg-muted border-border text-muted-foreground',
};
const manualColorFallback = 'bg-muted/20 border-muted/40 text-muted-foreground';

const getManualColor = (type?: string) => (type && MANUAL_TYPE_COLORS[type]) || manualColorFallback;
const getManualLabel = (type?: string) => EVENT_TYPES.find(t => t.value === type)?.label || type || 'Evento';

/* ───── Component ───── */
const AdminCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<ViewMode>('month');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('gravacao');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>(undefined);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formNotes, setFormNotes] = useState('');
  const [formEditorId, setFormEditorId] = useState('');
  const [saving, setSaving] = useState(false);

  // Options
  const [editors, setEditors] = useState<{id: string; display_name: string}[]>([]);

  // Editing
  const [editingEvent, setEditingEvent] = useState<Record<string, unknown> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [delRes, capRes, manRes] = await Promise.all([
      supabase.from('deliveries').select('id, title, due_date, status, delivery_type'),
      supabase.from('capture_sessions').select('id, scheduled_date, location_name, status, user_project_id, user_projects!inner(user_id)'),
      supabase.from('calendar_events').select('*'),
    ]);

    const mapped: CalendarEvent[] = [];

    (delRes.data || []).forEach((d) => {
      if (!d.due_date) return;
      mapped.push({
        id: `del-${d.id}`,
        title: d.title,
        date: format(startOfDay(new Date(d.due_date)), 'yyyy-MM-dd'),
        type: 'delivery',
        color: deliveryColor,
        raw: d as unknown as CalendarEventRaw,
      });
    });

    // Build a map of user_id -> full_name from profiles for capture sessions
    const capUserIds = [...new Set((capRes.data || []).map((c) => (c.user_projects as Record<string, unknown>)?.user_id as string).filter(Boolean))];
    const profileMap: Record<string, string> = {};
    if (capUserIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', capUserIds);
      (profs || []).forEach((p) => { profileMap[p.user_id] = p.full_name || ''; });
    }

    (capRes.data || []).forEach((c) => {
      const clientName = profileMap[(c.user_projects as Record<string, unknown>)?.user_id as string] || '';
      const locationLabel = c.location_name || 'Captação';
      const title = clientName ? `${clientName} — ${locationLabel}` : locationLabel;
      mapped.push({
        id: `cap-${c.id}`,
        title,
        date: c.scheduled_date,
        type: 'capture',
        color: captureColor,
        raw: { ...c, client_name: clientName } as unknown as CalendarEventRaw,
      });
    });

    (manRes.data || []).forEach((m) => {
      mapped.push({
        id: `man-${m.id}`,
        title: m.title,
        date: format(startOfDay(new Date(m.starts_at)), 'yyyy-MM-dd'),
        type: 'manual',
        color: getManualColor(m.type),
        raw: m,
      });
    });

    setEvents(mapped);
    setLoading(false);
  };

  const fetchOptions = async () => {
    const { data } = await supabase.from('editors').select('id, display_name').eq('status', 'available');
    setEditors(data || []);
  };

  useEffect(() => { fetchData(); fetchOptions(); }, []);

  /* ───── Calendar grid ───── */
  const days = useMemo(() => {
    if (mode === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      return eachDayOfInterval({ start: startOfWeek(ms, { locale: ptBR }), end: endOfWeek(me, { locale: ptBR }) });
    }
    if (mode === 'week') {
      return eachDayOfInterval({ start: startOfWeek(currentDate, { locale: ptBR }), end: endOfWeek(currentDate, { locale: ptBR }) });
    }
    return [startOfDay(currentDate)];
  }, [currentDate, mode]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [events]);

  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev'
      ? mode === 'month' ? subMonths : mode === 'week' ? subWeeks : subDays
      : mode === 'month' ? addMonths : mode === 'week' ? addWeeks : addDays;
    setCurrentDate((d) => fn(d, 1));
  };

  const title = mode === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
    : mode === 'week'
      ? `Semana de ${format(days[0], 'dd/MM', { locale: ptBR })} a ${format(days[days.length - 1], 'dd/MM', { locale: ptBR })}`
      : format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const today = startOfDay(new Date());

  /* ───── Create / Edit event ───── */
  const resetForm = () => {
    setFormTitle(''); setFormType('gravacao'); setFormStartDate(undefined);
    setFormStartTime('09:00'); setFormEndTime('10:00');
    setFormNotes(''); setFormEditorId('');
    setEditingEvent(null);
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };

  const openEdit = (ev: CalendarEvent) => {
    if (ev.type !== 'manual') return;
    const r = ev.raw;

    const parsedStart = r.starts_at ? new Date(r.starts_at) : null;
    const parsedEnd = r.ends_at ? new Date(r.ends_at) : null;

    if (!parsedStart || isNaN(parsedStart.getTime()) || !parsedEnd || isNaN(parsedEnd.getTime())) {
      toast.error('Evento com datas inválidas — não é possível editar');
      return;
    }

    setFormTitle(r.title);
    setFormType(r.type || 'gravacao');
    setFormStartDate(parsedStart);
    setFormStartTime(format(parsedStart, 'HH:mm'));
    setFormEndTime(format(parsedEnd, 'HH:mm'));
    setFormNotes(r.notes || '');
    setFormEditorId(r.related_editor_id || '');
    setEditingEvent(r);
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formStartDate) return;

    const startsAt = new Date(`${format(formStartDate, 'yyyy-MM-dd')}T${formStartTime}:00`);
    const endsAt = new Date(`${format(formStartDate, 'yyyy-MM-dd')}T${formEndTime}:00`);

    if (endsAt <= startsAt) {
      toast.error('Hora fim deve ser posterior à hora início');
      return;
    }

    setSaving(true);

    const payload = {
      title: formTitle.trim(),
      type: formType,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: formNotes.trim() || null,
      related_editor_id: formEditorId || null,
      related_client_id: null,
      created_by: user?.id || '',
    };

    if (editingEvent) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); setSaving(false); return; }
      toast.success('Evento atualizado');
    } else {
      const { error } = await supabase.from('calendar_events').insert(payload);
      if (error) { toast.error('Erro ao criar: ' + error.message); setSaving(false); return; }
      toast.success('Evento criado');
    }

    resetForm();
    setCreateOpen(false);
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Evento excluído');
    setDetailEvent(null);
    fetchData();
  };

  const handleEventClick = (ev: CalendarEvent) => {
    setDetailEvent(ev);
  };

  const isFormValid = formTitle.trim().length > 0 && formStartDate;

  /* ───── Render ───── */
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold capitalize min-w-[200px] text-center">{title}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => { if (v) setMode(v as ViewMode); }}
            className="border border-border rounded-full p-0.5 bg-secondary/60"
          >
            {(['month', 'week', 'day'] as const).map((m) => (
              <ToggleGroupItem
                key={m}
                value={m}
                className="h-6 px-2 rounded-full text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {m === 'month' ? 'Mês' : m === 'week' ? 'Semana' : 'Dia'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Evento</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-[20px] bg-secondary/40 border border-border overflow-hidden">
          {/* Weekday headers (skip for day view) */}
          {mode !== 'day' && (
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2 text-center text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {wd}
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className={mode === 'day' ? '' : 'grid grid-cols-7'}>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const maxVisible = mode === 'day' ? 999 : 3;

              return (
                <div
                  key={key}
                  className={cn(
                    'border-b border-r border-border p-1.5 transition-colors',
                    mode === 'day' ? 'min-h-[300px]' : 'min-h-[80px] md:min-h-[100px]',
                    !isCurrentMonth && mode === 'month' ? 'opacity-30' : '',
                    isToday ? 'bg-primary/5' : 'hover:bg-foreground/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between px-0.5 mb-1">
                    <span className={cn(
                      'text-[11px] font-medium',
                      isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : 'text-muted-foreground',
                    )}>
                      {mode === 'day' ? format(day, "dd 'de' MMMM", { locale: ptBR }) : format(day, 'd')}
                    </span>
                    {dayEvents.length > maxVisible && (
                      <span className="text-[9px] text-muted-foreground">+{dayEvents.length - maxVisible}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.length === 0 && mode === 'day' ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
                        <p className="text-xs text-muted-foreground/60">Nenhum evento neste período.</p>
                      </div>
                    ) : (
                      dayEvents.slice(0, maxVisible).map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => handleEventClick(ev)}
                          className={cn(
                            'w-full text-left rounded px-1.5 py-0.5 text-[9px] font-medium truncate border cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1',
                            ev.color,
                          )}
                          title={ev.title}
                        >
                          {ev.type === 'delivery' && <Package className="h-2.5 w-2.5 shrink-0" />}
                          {ev.type === 'capture' && <Camera className="h-2.5 w-2.5 shrink-0" />}
                          {ev.type === 'manual' && <Pin className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {[
          { color: deliveryColor, label: 'Entregas', icon: Package },
          { color: captureColor, label: 'Captações', icon: Camera },
          ...EVENT_TYPES.map(t => ({ color: MANUAL_TYPE_COLORS[t.value], label: t.label, icon: t.icon })),
        ].map(({ color, label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full border', color)} />
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* ───── Detail modal ───── */}
      <Dialog open={!!detailEvent} onOpenChange={() => setDetailEvent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {detailEvent?.type === 'delivery' && <Package className="h-4 w-4 text-primary" />}
              {detailEvent?.type === 'capture' && <Camera className="h-4 w-4 text-[hsl(var(--queue-green))]" />}
              {detailEvent?.type === 'manual' && <Pin className="h-4 w-4 text-[hsl(var(--energy-leve))]" />}
              {detailEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {detailEvent?.type === 'delivery' && 'Entrega'}
              {detailEvent?.type === 'capture' && 'Captação'}
              {detailEvent?.type === 'manual' && 'Evento manual'}
              {' — '}
              {detailEvent && format(new Date(detailEvent.date), "dd/MM/yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {detailEvent?.type === 'delivery' && (
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>Status: <Badge variant="outline" className="text-[10px] ml-1">{detailEvent.raw.status}</Badge></p>
              <p>Tipo: {detailEvent.raw.delivery_type}</p>
            </div>
          )}
          {detailEvent?.type === 'capture' && (
            <div className="text-xs space-y-1 text-muted-foreground">
              {detailEvent.raw.client_name && <p>Cliente: {detailEvent.raw.client_name}</p>}
              <p>Status: <Badge variant="outline" className="text-[10px] ml-1">{detailEvent.raw.status}</Badge></p>
              {detailEvent.raw.location_name && <p>Local: {detailEvent.raw.location_name}</p>}
              <p>Data: {format(new Date(detailEvent.date), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          )}
          {detailEvent?.type === 'manual' && (
            <div className="text-xs space-y-2 text-muted-foreground">
              <p>Tipo: {getManualLabel(detailEvent.raw.type)}</p>
              <p>Início: {format(new Date(detailEvent.raw.starts_at), "HH:mm", { locale: ptBR })}</p>
              <p>Fim: {format(new Date(detailEvent.raw.ends_at), "HH:mm", { locale: ptBR })}</p>
              {detailEvent.raw.notes && <p className="pt-1 border-t border-border/50">{detailEvent.raw.notes}</p>}
            </div>
          )}

          {detailEvent?.type === 'manual' && (
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => { handleDelete(detailEvent.raw.id); }}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
              <Button size="sm" className="gap-1" onClick={() => { setDetailEvent(null); openEdit(detailEvent); }}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ───── Create/Edit modal ───── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetForm(); setCreateOpen(o); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>Crie um evento personalizado no calendário.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título do evento" maxLength={120} />
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formStartDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formStartDate ? format(formStartDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formStartDate} onSelect={setFormStartDate} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hora início</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora fim</Label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => { const TIcon = t.icon; return <SelectItem key={t.value} value={t.value}><span className="inline-flex items-center gap-1.5"><TIcon className="h-3.5 w-3.5" /> {t.label}</span></SelectItem>; })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Editor (opcional)</Label>
              <Select value={formEditorId} onValueChange={setFormEditorId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {editors.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observações..." rows={3} maxLength={500} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!isFormValid || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEvent ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendar;

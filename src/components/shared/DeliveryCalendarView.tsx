import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';

/* ───── Status → colour mapping (HSL tokens) ───── */
const statusColor: Record<string, string> = {
  pending:     'bg-[hsl(var(--queue-yellow))]/20 border-[hsl(var(--queue-yellow))]/40 text-[hsl(var(--queue-yellow))]',
  queue:       'bg-[hsl(var(--queue-yellow))]/20 border-[hsl(var(--queue-yellow))]/40 text-[hsl(var(--queue-yellow))]',
  in_progress: 'bg-primary/15 border-primary/30 text-primary',
  review:      'bg-[hsl(var(--energy-leve))]/20 border-[hsl(var(--energy-leve))]/40 text-[hsl(var(--energy-leve))]',
  revision:    'bg-destructive/15 border-destructive/30 text-destructive',
  approved:    'bg-[hsl(var(--queue-green))]/20 border-[hsl(var(--queue-green))]/40 text-[hsl(var(--queue-green))]',
  cancelled:   'bg-muted text-muted-foreground border-border',
};

type CalendarMode = 'month' | 'week';

interface DeliveryCalendarViewProps {
  deliveries: DeliveryData[];
  onSelect: (delivery: DeliveryData) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DeliveryCalendarView = ({ deliveries, onSelect }: DeliveryCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('month');

  /* Build a map: dateKey → deliveries */
  const deliveriesByDate = useMemo(() => {
    const map = new Map<string, DeliveryData[]>();
    deliveries.forEach((d) => {
      const dateStr = d.due_date;
      if (!dateStr) return;
      const key = format(startOfDay(new Date(dateStr)), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [deliveries]);

  /* Compute visible days */
  const days = useMemo(() => {
    if (mode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({
        start: startOfWeek(monthStart, { locale: ptBR }),
        end: endOfWeek(monthEnd, { locale: ptBR }),
      });
    }
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekEnd = endOfWeek(currentDate, { locale: ptBR });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, mode]);

  const navigate = (dir: 'prev' | 'next') => {
    if (mode === 'month') {
      setCurrentDate((d) => (dir === 'prev' ? subMonths(d, 1) : addMonths(d, 1)));
    } else {
      setCurrentDate((d) => (dir === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1)));
    }
  };

  const title = mode === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
    : `Semana de ${format(days[0], "dd/MM", { locale: ptBR })} a ${format(days[days.length - 1], "dd/MM", { locale: ptBR })}`;

  const today = startOfDay(new Date());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold capitalize min-w-[180px] text-center">{title}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => { if (v) setMode(v as CalendarMode); }}
            className="border border-white/8 rounded-full p-0.5 bg-abba-surface/60"
          >
            <ToggleGroupItem
              value="month"
              className="h-6 px-2 rounded-full text-[10px] data-[state=on]:bg-abba-lime data-[state=on]:text-abba-dark"
            >
              Mês
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              className="h-6 px-2 rounded-full text-[10px] data-[state=on]:bg-abba-lime data-[state=on]:text-abba-dark"
            >
              Semana
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-[20px] bg-abba-surface/40 border border-white/6 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-white/6">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="py-2 text-center text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              {wd}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayDeliveries = deliveriesByDate.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={`min-h-[80px] md:min-h-[100px] border-b border-r border-white/6 p-1 transition-colors ${
                  !isCurrentMonth && mode === 'month' ? 'opacity-30' : ''
                } ${isToday ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between px-0.5 mb-0.5">
                  <span
                    className={`text-[11px] font-medium ${
                      isToday
                        ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayDeliveries.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{dayDeliveries.length - 3}</span>
                  )}
                </div>

                {/* Events (max 3 visible) */}
                <div className="space-y-0.5">
                  {dayDeliveries.slice(0, 3).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onSelect(d)}
                      className={`w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate border cursor-pointer transition-opacity hover:opacity-80 ${
                        statusColor[d.status] || statusColor.pending
                      }`}
                      title={d.title}
                    >
                      {d.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { status: 'pending', label: 'A Fazer' },
          { status: 'in_progress', label: 'Em Produção' },
          { status: 'review', label: 'Revisar' },
          { status: 'approved', label: 'Concluído' },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full border ${statusColor[status]}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryCalendarView;

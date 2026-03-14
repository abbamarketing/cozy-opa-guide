import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
const DeliveryDetailModal = lazy(() => import('./DeliveryDetailModal'));
import type { DeliveryData } from './DeliveryCard';
import type { UserProjectData } from '@/hooks/useUserProject';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'completed' | 'expiry';
  delivery: DeliveryData;
}

interface DeliveryCalendarProps {
  userProject: UserProjectData;
}

const eventStyles: Record<string, { bg: string; text: string; border: string }> = {
  deadline: {
    bg: 'bg-[hsl(45,93%,47%)]/15',
    text: 'text-[hsl(45,93%,47%)]',
    border: 'border-[hsl(45,93%,47%)]/30',
  },
  completed: {
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
  },
  expiry: {
    bg: 'bg-destructive/15',
    text: 'text-destructive',
    border: 'border-destructive/30',
  },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DeliveryCalendar = ({ userProject }: DeliveryCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showExpiry, setShowExpiry] = useState(true);

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, editor:editors(display_name)')
      .eq('user_project_id', userProject.id)
      .order('due_date', { ascending: true });

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
  }, [userProject.id]);

  // Build calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    for (const d of deliveries) {
      // Deadline events
      if (d.due_date && ['pending', 'in_progress', 'review', 'revision'].includes(d.status)) {
        if (!showPendingOnly || ['pending', 'in_progress'].includes(d.status)) {
          result.push({
            id: `deadline-${d.id}`,
            title: `Prazo: ${d.title}`,
            date: new Date(d.due_date),
            type: 'deadline',
            delivery: d,
          });
        }
      }

      // Completed events
      if (d.status === 'approved' && d.approved_at) {
        if (!showPendingOnly) {
          result.push({
            id: `completed-${d.id}`,
            title: d.title,
            date: new Date(d.approved_at),
            type: 'completed',
            delivery: d,
          });
        }
      }

      // Download expiry (90 days after approval)
      if (d.status === 'approved' && d.approved_at && d.file_url && showExpiry) {
        const expiryDate = addDays(new Date(d.approved_at), 90);
        result.push({
          id: `expiry-${d.id}`,
          title: `⚠️ Download expira: ${d.title}`,
          date: expiryDate,
          type: 'expiry',
          delivery: d,
        });
      }
    }

    return result;
  }, [deliveries, showPendingOnly, showExpiry]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => events.filter((e) => isSameDay(e.date, day));

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[160px] text-center text-lg font-bold capitalize text-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="pending-only"
              checked={showPendingOnly}
              onCheckedChange={setShowPendingOnly}
            />
            <Label htmlFor="pending-only" className="text-xs text-muted-foreground cursor-pointer">
              Apenas pendentes
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-expiry"
              checked={showExpiry}
              onCheckedChange={setShowExpiry}
            />
            <Label htmlFor="show-expiry" className="text-xs text-muted-foreground cursor-pointer">
              Expirações
            </Label>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(45,93%,47%)]" />
          <span className="text-muted-foreground">Prazo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-muted-foreground">Concluído</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Expiração</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            return (
              <div
                key={i}
                className={`min-h-[80px] border-b border-r border-border/30 p-1 transition-colors ${
                  inMonth ? 'bg-card/50' : 'bg-muted/10'
                } ${today ? 'bg-primary/5' : ''}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    today
                      ? 'bg-primary text-primary-foreground font-bold'
                      : inMonth
                      ? 'text-card-foreground'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const style = eventStyles[event.type];
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedDelivery(event.delivery)}
                        className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium border ${style.bg} ${style.text} ${style.border} hover:opacity-80 transition-opacity`}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <p className="text-[9px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <Suspense fallback={null}>
        <DeliveryDetailModal
          open={!!selectedDelivery}
          onOpenChange={() => setSelectedDelivery(null)}
          delivery={selectedDelivery}
          onUpdated={fetchDeliveries}
        />
      </Suspense>
    </div>
  );
};

export default DeliveryCalendar;

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

/* ─── Types ─── */
export interface KanbanColumn {
  id: string;
  title: string;
  statuses: string[];
  description?: string;
}

export interface KanbanBoardProps<T extends { id: string; status: string }> {
  columns: KanbanColumn[];
  items: T[];
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  onStatusChange?: (itemId: string, newStatus: string) => Promise<void>;
  canDragBetweenColumns?: boolean;
  emptyLabel?: string;
  renderEmpty?: (column: KanbanColumn, hasAnyItems: boolean) => React.ReactNode;
  dataTour?: string;
}

/* ─── Sortable Card Wrapper ─── */
function SortableCard<T extends { id: string }>({
  item,
  renderCard,
  canDrag,
  index,
}: {
  item: T;
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  canDrag: boolean;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: canDrag ? 'grab' : 'default',
    animationDelay: `${index * 50}ms`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="animate-fade-in"
      {...attributes}
      {...listeners}
    >
      {renderCard(item, isDragging)}
    </div>
  );
}

/* ─── Droppable Column ─── */
function KanbanColumnComponent<T extends { id: string; status: string }>({
  column,
  items,
  renderCard,
  canDrag,
  isOver,
  emptyLabel,
  renderEmpty,
  hasAnyItems,
  isMobile,
}: {
  column: KanbanColumn;
  items: T[];
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  canDrag: boolean;
  isOver: boolean;
  emptyLabel?: string;
  renderEmpty?: (column: KanbanColumn, hasAnyItems: boolean) => React.ReactNode;
  hasAnyItems: boolean;
  isMobile: boolean;
}) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <div
      className={cn(
'flex flex-col rounded-[20px] bg-abba-surface/40 border p-2 shrink-0 transition-colors overflow-hidden',
        isMobile
          ? 'w-[85vw] min-w-[85vw] snap-start'
          : 'min-w-[280px] max-w-[320px]',
        isOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-white/6'
      )}
    >
      <div className="mb-2 px-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-sans font-semibold uppercase tracking-widest text-muted-foreground">
            {column.title}
          </h3>
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] justify-center px-1.5 text-[10px] font-sans"
          >
            {items.length}
          </Badge>
        </div>
        {column.description && (
          <p className="text-[10px] text-muted-foreground/70">{column.description}</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 p-0.5 min-h-[60px] w-full overflow-hidden">
            {items.length === 0 ? (
              renderEmpty ? (
                renderEmpty(column, hasAnyItems)
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Video className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-[10px] font-sans text-muted-foreground/50">
                    {emptyLabel || 'Nenhuma entrega aqui'}
                  </p>
                </div>
              )
            ) : (
              items.map((item, idx) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  renderCard={renderCard}
                  canDrag={canDrag}
                  index={idx}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

/* ─── Scroll Indicator Dots ─── */
function ScrollDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <div className="flex justify-center gap-1.5 pt-2 pb-1 md:hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-200',
            i === activeIndex
              ? 'w-4 bg-primary'
              : 'w-1.5 bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

/* ─── Main Board ─── */
function KanbanBoard<T extends { id: string; status: string }>({
  columns,
  items,
  renderCard,
  onStatusChange,
  canDragBetweenColumns = false,
  emptyLabel,
  renderEmpty,
  dataTour,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Track scroll position for dot indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isMobile) return;

    const handleScroll = () => {
      const colWidth = el.scrollWidth / columns.length;
      const idx = Math.round(el.scrollLeft / colWidth);
      setActiveScrollIndex(Math.min(idx, columns.length - 1));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isMobile, columns.length]);

  const getColumnForStatus = useCallback(
    (status: string) => columns.find((c) => c.statuses.includes(status)),
    [columns]
  );

  const getColumnForItemId = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return null;
      return getColumnForStatus(item.status);
    },
    [items, getColumnForStatus]
  );

  const itemsByColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    columns.forEach((c) => map.set(c.id, []));
    items.forEach((item) => {
      const col = getColumnForStatus(item.status);
      if (col) map.get(col.id)?.push(item);
    });
    return map;
  }, [columns, items, getColumnForStatus]);

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumnId(null); return; }

    const overCol = columns.find((c) => c.id === over.id);
    if (overCol) {
      setOverColumnId(overCol.id);
    } else {
      const col = getColumnForItemId(over.id as string);
      setOverColumnId(col?.id || null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverColumnId(null);

    if (!over || !canDragBetweenColumns || !onStatusChange) return;

    const activeCol = getColumnForItemId(active.id as string);

    let targetCol = columns.find((c) => c.id === over.id);
    if (!targetCol) {
      targetCol = getColumnForItemId(over.id as string) || undefined;
    }

    if (!targetCol || !activeCol || targetCol.id === activeCol.id) return;

    const newStatus = targetCol.statuses[0];
    try {
      await onStatusChange(active.id as string, newStatus);
    } catch {
      // Parent handles rollback
    }
  };

  const hasAnyItems = items.length > 0;

  // Mobile header showing current column
  const activeCol = columns[activeScrollIndex];
  const activeColItems = activeCol ? (itemsByColumn.get(activeCol.id) || []) : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile column indicator */}
      {isMobile && activeCol && (
        <div className="flex items-center justify-between px-1 mb-2 md:hidden">
          <span className="text-xs font-sans font-semibold text-foreground">
            {activeCol.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-sans">
            {activeColItems.length} · {activeScrollIndex + 1}/{columns.length}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'flex gap-3 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth min-w-0',
          isMobile
            ? 'snap-x snap-mandatory -mx-1 px-1 scrollbar-none'
            : 'scrollbar-none'
        )}
        data-tour={dataTour}
      >
        {columns.map((col) => (
          <KanbanColumnComponent
            key={col.id}
            column={col}
            items={itemsByColumn.get(col.id) || []}
            renderCard={renderCard}
            canDrag={canDragBetweenColumns}
            isOver={overColumnId === col.id}
            emptyLabel={emptyLabel}
            renderEmpty={renderEmpty}
            hasAnyItems={hasAnyItems}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Scroll dots for mobile */}
      {isMobile && <ScrollDots count={columns.length} activeIndex={activeScrollIndex} />}

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 shadow-2xl rotate-2 scale-105 cursor-grabbing">
            {renderCard(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;

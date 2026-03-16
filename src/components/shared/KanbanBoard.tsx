import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
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
  /** Render a single card */
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  /** Called when an item is moved to a new column status. Return false/throw to revert. */
  onStatusChange?: (itemId: string, newStatus: string) => Promise<void>;
  /** Whether drag between columns is allowed */
  canDragBetweenColumns?: boolean;
  /** Empty state label */
  emptyLabel?: string;
  /** Custom empty state for specific column */
  renderEmpty?: (column: KanbanColumn, hasAnyItems: boolean) => React.ReactNode;
  /** data-tour attribute for the board */
  dataTour?: string;
}

/* ─── Sortable Card Wrapper ─── */
function SortableCard<T extends { id: string }>({
  item,
  renderCard,
  canDrag,
}: {
  item: T;
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  canDrag: boolean;
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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
}: {
  column: KanbanColumn;
  items: T[];
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode;
  canDrag: boolean;
  isOver: boolean;
  emptyLabel?: string;
  renderEmpty?: (column: KanbanColumn, hasAnyItems: boolean) => React.ReactNode;
  hasAnyItems: boolean;
}) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-[20px] bg-abba-surface/40 border p-2 min-w-[280px] max-w-[320px] shrink-0 transition-colors',
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
          <div className="space-y-2 p-0.5 min-h-[60px]">
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
              items.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  renderCard={renderCard}
                  canDrag={canDrag}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

    // over could be a column ID or an item ID
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

    // Determine the target column
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
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
          />
        ))}
      </div>

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

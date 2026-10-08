'use client';
import { useMemo, useContext, createContext } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensors,
  useSensor,
  PointerSensor,
  type DragStartEvent,
  type DragPendingEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type DragAbortEvent,
} from '@dnd-kit/core';

import { attr } from '@/lib/utils';
import { isString, isNumber } from '@/lib/utils/js-is';
import isRecord from '@/lib/utils/object-utils/is-record';
import runIfFunction from '@/lib/utils/function-utils/run-if-function';

type Node = {
  id: string;
};

type DraggableData = {
  source: {
    treeId: string;
    nodeId: string;
  };
};

type DroppableData = {
  target: {
    treeId: string;
    index: number;
  };
};

type DraggableState = {
  isDragging: boolean;
};

type DroppableState = {
  isDropping: boolean;
};

export type MoveEvent<T extends Node> = DraggableData & DroppableData & { node: T };

export type Adapter<T extends Node> = {
  getNode(treeId: string, nodeId: string): T | undefined;
  onMove(event: MoveEvent<T>): void;
};

export interface ProviderProps<T extends Node> {
  adapter: Adapter<T>;
  children?: React.ReactNode;
  onDragStart?(event: DragStartEvent): void;
  onDragPending?(event: DragPendingEvent): void;
  onDragMove?(event: DragMoveEvent): void;
  onDragOver?(event: DragOverEvent): void;
  onDragEnd?(event: DragEndEvent): void;
  onDragCancel?(event: DragCancelEvent): void;
  onDragAbort?(event: DragAbortEvent): void;
}
export interface ListProps extends React.ComponentProps<'ol'> {
  id: string;
}
export interface DraggableItemProps extends Omit<React.ComponentPropsWithoutRef<'li'>, 'children'> {
  id: string;
  children?: React.ReactNode | ((state: DraggableState) => React.ReactElement);
}
export interface DroppableItemProps extends Omit<React.ComponentPropsWithoutRef<'li'>, 'children'> {
  index: number;
  children?: React.ReactNode | ((state: DroppableState) => React.ReactElement);
}

export function Provider<T extends Node>({
  children,
  adapter,
  onDragStart,
  onDragPending,
  onDragMove,
  onDragOver,
  onDragEnd: onDragEndProp,
  onDragCancel,
  onDragAbort,
}: ProviderProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    onDragEndProp?.(event);

    const { active, over } = event;

    if (!over) return;

    const source = active.data.current?.source;
    const target = over.data.current?.target;

    if (!isSource(source) || !isTarget(target)) return;

    const node = adapter.getNode(source.treeId, source.nodeId);

    if (!node) return;

    adapter.onMove({ source, target, node });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragPending={onDragPending}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      onDragAbort={onDragAbort}
    >
      {children}
    </DndContext>
  );
}

export function List({ ref, children, id, ...props }: ListProps) {
  const value = useMemo(() => ({ treeId: id }), [id]);
  return (
    <SortableContext.Provider value={value}>
      <ol ref={ref} {...props}>
        {children}
      </ol>
    </SortableContext.Provider>
  );
}

export function DraggableItem({ children, id, ...props }: DraggableItemProps) {
  const { treeId } = useSortableContext();

  const draggableId = createDraggableId(treeId, id);
  const data: DraggableData = {
    source: { treeId, nodeId: id },
  };

  const { active, setNodeRef: ref, listeners } = useDraggable({ id: draggableId, data });

  const isDragging = active?.id === draggableId;

  return (
    <li ref={ref} data-active={attr(isDragging, true)} {...listeners} {...props}>
      {runIfFunction(children, { isDragging })}
    </li>
  );
}

export function DroppableItem({ children, index, ...props }: DroppableItemProps) {
  const { treeId } = useSortableContext();

  const droppableId = createDroppableId(treeId, index);
  const data: DroppableData = {
    target: { treeId, index },
  };

  const { over, setNodeRef: ref } = useDroppable({ id: droppableId, data });

  const isDropping = over?.id === droppableId;

  return (
    <li ref={ref} role="presentation" data-over={attr(isDropping, true)} {...props}>
      {runIfFunction(children, { isDropping })}
    </li>
  );
}

// SortableContext ////////////////////////////////////////////////////////////////////////////////

type TSortableContext = {
  treeId: string;
};

const SortableContext = createContext({} as TSortableContext);

function useSortableContext() {
  return useContext(SortableContext);
}

// Helpers ////////////////////////////////////////////////////////////////////////////////////////

function createDraggableId(treeId: string, nodeId: string) {
  return `${treeId}:${nodeId}`;
}

function createDroppableId(treeId: string, index: number) {
  return `${treeId}:${index}`;
}

function isSource(arg: unknown): arg is DraggableData['source'] {
  if (!isRecord(arg)) return false;

  return isNonEmptyString(arg.treeId) && isNonEmptyString(arg.nodeId);
}

function isTarget(arg: unknown): arg is DroppableData['target'] {
  if (!isRecord(arg)) return false;

  return (
    isNonEmptyString(arg.treeId) &&
    isNumber(arg.index) &&
    Number.isInteger(arg.index) &&
    arg.index >= 0
  );
}

function isNonEmptyString(arg: unknown): arg is string {
  return isString(arg) && arg.length > 0;
}

'use client';
import { Fragment, useRef, useState, useEffect } from 'react';

import {
  ROOT_TREE_ID,
  insertNode,
  updateNode,
  moveNode,
  removeNode,
  getNodeChildren,
  type EventSource,
  type EventTarget,
  type InsertEvent,
  type UpdateEvent,
  type RemoveEvent,
} from '@/lib/utils/tree';
import uuid from '@/lib/utils/uuid';

import * as Sortable from './ui/sortable';

type Node = {
  id: string;
  title: string;
  children?: Node[];
};

interface TreeEditorOptions {
  maxDepth?: number;
}

interface TreeEditorProps<T extends Node> extends TreeEditorOptions {
  value?: T;
  onChange?(value: T): void;
}

export default function TreeEditor<T extends Node>({
  value = { id: ROOT_TREE_ID, title: 'Tree', children: [] } as unknown as T,
  maxDepth = Infinity,
  onChange,
}: TreeEditorProps<T>) {
  const [state, dispatch] = useState(() => toState(value, maxDepth));

  useEffect(() => {
    onChange?.(fromState(state, value));
  }, [state]);

  const adapter: Sortable.Adapter<Node> = {
    getNode(treeId, nodeId) {
      return getNodeChildren(state.children ?? [], treeId)?.find((it) => it.id === nodeId);
    },

    onMove(event) {
      dispatch((s) => {
        const nextChildren = moveNode(event, s.children ?? []);

        if (nextChildren === s.children) return s;
        return { ...s, children: nextChildren };
      });
    },
  };

  function onInsert(event: InsertEvent<T>) {
    dispatch((s) => ({
      ...s,
      children: insertNode(event, s.children ?? []),
    }));
  }

  function onUpdate(event: UpdateEvent<T>) {
    dispatch((s) => ({
      ...s,
      children: updateNode(event, s.children ?? []),
    }));
  }

  function onRemove(event: RemoveEvent) {
    dispatch((s) => ({
      ...s,
      children: removeNode(event, s.children ?? []),
    }));
  }

  const input = useNodeInput({ onInsert, onUpdate });

  return (
    <Sortable.Provider adapter={adapter}>
      <Tree node={state} input={input} maxDepth={maxDepth} onRemove={onRemove} />
    </Sortable.Provider>
  );
}

// Tree ///////////////////////////////////////////////////////////////////////////////////////////

interface TreeOptions {
  maxDepth?: number;
}

interface TreeProps<T extends Node> extends TreeOptions {
  node: T;
  input: ReturnType<typeof useNodeInput>;
  onRemove?(event: RemoveEvent): void;
  _depth?: number;
}

function Tree<T extends Node>({
  node,
  input,
  maxDepth = Infinity,
  onRemove,
  _depth = 0,
}: TreeProps<T>) {
  return (
    <Sortable.List id={node.id}>
      {input.isTargetNode(node) && (
        <li role="presentation">
          <div>
            <input
              type="text"
              required
              autoComplete="off"
              {...{ ref: input.ref }}
              {...input.listeners}
            />
          </div>
        </li>
      )}

      <Sortable.DroppableItem index={0} />

      {node.children?.map((child, i) => (
        <Fragment key={child.id}>
          <Sortable.DraggableItem id={child.id}>
            <div
              onDoubleClick={() => {
                input.actions.update({ treeId: node.id, nodeId: child.id });
              }}
            >
              {input.isSourceNode(child) ? (
                <input
                  type="text"
                  defaultValue={child.title}
                  required
                  autoComplete="off"
                  {...{ ref: input.ref }}
                  {...input.listeners}
                />
              ) : (
                child.title
              )}
            </div>
          </Sortable.DraggableItem>

          {child.children && _depth < maxDepth && (
            <Tree
              node={child}
              input={input}
              maxDepth={maxDepth}
              onRemove={onRemove}
              _depth={_depth + 1}
            />
          )}

          <Sortable.DroppableItem index={i + 1} />
        </Fragment>
      ))}
    </Sortable.List>
  );
}

// Hooks //////////////////////////////////////////////////////////////////////////////////////////

type NodeInsertInputState = {
  type: 'insert';
  target: EventTarget;
};

type NodeUpdateInputState = {
  type: 'update';
  source: EventSource;
};

type NodeInputState = NodeInsertInputState | NodeUpdateInputState;

interface UseNodeInputOptions<T extends Node> {
  onInsert?(event: InsertEvent<T>): void;
  onUpdate?(event: UpdateEvent<T>): void;
}

function useNodeInput<T extends Node>({ onInsert, onUpdate }: UseNodeInputOptions<T>) {
  const ref = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useState<NodeInputState>();

  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [state]);

  function commit(value: string) {
    if (!state) return;

    if (state.type === 'insert') {
      onInsert?.({
        node: {
          id: uuid(),
          title: value,
          children: [],
        } as unknown as T,
        target: state.target,
      });
    }

    if (state.type === 'update') {
      onUpdate?.({
        node: {
          title: value,
        } as Partial<T>,
        source: state.source,
      });
    }

    dispatch(undefined);
  }

  function insert(target: EventTarget) {
    dispatch({ type: 'insert', target });
  }

  function update(source: EventSource) {
    dispatch({ type: 'update', source });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      dispatch(undefined);
      return;
    }

    if (event.key !== 'Enter') return;

    event.preventDefault();

    const el = event.currentTarget;
    const value = el.value.trim();

    if (value) commit(value);
  }

  function onBlur(event: React.FocusEvent<HTMLInputElement, Element>) {
    const el = event.currentTarget;
    const value = el.value.trim();

    if (value) commit(value);
    else dispatch(undefined);
  }

  function isTargetNode(node: Node) {
    if (state?.type !== 'insert') return false;

    return node.id === state.target.treeId;
  }

  function isSourceNode(node: Node) {
    if (state?.type !== 'update') return false;

    return node.id === state.source.nodeId;
  }

  return {
    ref,
    state,
    actions: {
      insert,
      update,
    },
    listeners: {
      onKeyDown,
      onBlur,
    },
    isTargetNode,
    isSourceNode,
  } as const;
}

// Helpers ////////////////////////////////////////////////////////////////////////////////////////

function toState<T extends Node>(defaultValue: T, maxDepth = Infinity, _depth = -1): T {
  const next = { ...defaultValue };

  if (_depth === -1) {
    next.id = ROOT_TREE_ID;
  }

  if (_depth < maxDepth && Array.isArray(next.children)) {
    next.children = next.children.map((child) => toState(child, maxDepth, _depth + 1));
  }

  if (_depth === maxDepth && Object.prototype.hasOwnProperty.call(next, 'children')) {
    delete next.children;
  }

  return next;
}

function fromState<T extends Node>(state: T, defaultValue: T): T {
  return { ...state, id: defaultValue.id };
}

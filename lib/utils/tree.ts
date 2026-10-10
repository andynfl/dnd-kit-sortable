type Node = {
  id: string;
  children?: Node[];
};

type EventSource = {
  treeId: string;
  nodeId: string;
};

type EventTarget = {
  treeId: string;
  index: number;
};

type InsertEvent<T extends Node> = {
  node: T;
  target: EventTarget;
};

type MoveEvent = {
  source: EventSource;
  target: EventTarget;
};

type RemoveEvent = {
  source: EventSource;
};

// Constants //////////////////////////////////////////////////////////////////////////////////////

export const ROOT_TREE_ID = '__root__';

// Public API /////////////////////////////////////////////////////////////////////////////////////

export function insertNode<T extends Node>(event: InsertEvent<T>, nodes: T[]) {
  const { node, target } = event;

  const targetChildren = getNodeChildren(nodes, target.treeId);
  if (!targetChildren) return nodes;

  const nextChildren = [...targetChildren];
  nextChildren.splice(target.index, 0, node);

  return setNodeChildren(nodes, target.treeId, nextChildren);
}

export function moveNode<T extends Node>(event: MoveEvent, nodes: T[]) {
  const { source, target } = event;

  const sourceChildren = getNodeChildren(nodes, source.treeId);
  if (!sourceChildren) return nodes;

  const sourceIndex = sourceChildren.findIndex((it) => it.id === source.nodeId);
  if (sourceIndex === -1) return nodes;

  const movedNode = sourceChildren[sourceIndex];

  if (target.treeId === movedNode.id || hasNode(movedNode.children ?? [], target.treeId)) {
    return nodes;
  }

  const remainingNodes = setNodeChildren(
    nodes,
    source.treeId,
    sourceChildren.filter((it) => it.id !== source.nodeId),
  );

  const targetChildren = getNodeChildren(remainingNodes, target.treeId);
  if (!targetChildren) return nodes;

  const insertIndex = Math.max(
    0,
    Math.min(
      source.treeId === target.treeId && sourceIndex < target.index
        ? target.index - 1
        : target.index,
      targetChildren.length,
    ),
  );

  if (source.treeId === target.treeId && insertIndex === sourceIndex) {
    return nodes;
  }

  return setNodeChildren(remainingNodes, target.treeId, [
    ...targetChildren.slice(0, insertIndex),
    movedNode,
    ...targetChildren.slice(insertIndex),
  ]);
}

export function removeNode<T extends Node>(event: RemoveEvent, nodes: T[]) {
  const { source } = event;

  const sourceChildren = getNodeChildren(nodes, source.treeId);
  if (!sourceChildren) return nodes;

  const sourceIndex = sourceChildren.findIndex((it) => it.id === source.nodeId);
  if (sourceIndex === -1) return nodes;

  const nextChildren = [...sourceChildren];
  nextChildren.splice(sourceIndex, 1);

  return setNodeChildren(nodes, source.treeId, nextChildren);
}

export function getNodeChildren<T extends Node>(nodes: T[], id: string): T[] | undefined {
  if (id === ROOT_TREE_ID) return nodes;

  return findNode(nodes, id)?.children as T[];
}

// Helpers ////////////////////////////////////////////////////////////////////////////////////////

function setNodeChildren<T extends Node>(nodes: T[], id: string, children: T[]): T[] {
  if (id === ROOT_TREE_ID) return children;

  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, children };
    }

    if (node.children) {
      const nextChildren = setNodeChildren(node.children, id, children);

      if (nextChildren !== node.children) {
        return { ...node, children: nextChildren };
      }
    }

    return node;
  });
}

function findNode<T extends Node>(nodes: T[], id: string): T | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;

    if (node.children) {
      const found = findNode(node.children, id);

      if (found) return found as T;
    }
  }

  return undefined;
}

function hasNode<T extends Node>(nodes: T[], id: string) {
  for (const node of nodes) {
    if (node.id === id) return true;

    if (node.children && hasNode(node.children, id)) {
      return true;
    }
  }

  return false;
}

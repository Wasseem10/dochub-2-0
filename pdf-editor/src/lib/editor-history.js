export const HISTORY_LIMIT = 25;

export function appendHistorySnapshot(stack, snapshot, limit = HISTORY_LIMIT) {
  return [...(stack || []), snapshot].slice(-limit);
}

export function undoHistory({ undoStack, redoStack, currentSnapshot, limit = HISTORY_LIMIT }) {
  if (!undoStack?.length) return null;
  const previousSnapshot = undoStack[undoStack.length - 1];
  return {
    snapshot: previousSnapshot,
    undoStack: undoStack.slice(0, -1),
    redoStack: [currentSnapshot, ...(redoStack || [])].slice(0, limit),
  };
}

export function redoHistory({ undoStack, redoStack, currentSnapshot, limit = HISTORY_LIMIT }) {
  if (!redoStack?.length) return null;
  const [nextSnapshot, ...remainingRedo] = redoStack;
  return {
    snapshot: nextSnapshot,
    undoStack: appendHistorySnapshot(undoStack, currentSnapshot, limit),
    redoStack: remainingRedo,
  };
}

export const HISTORY_LIMIT = 50;

export function createHistory() {
  return { past: [], future: [] };
}

export function pushHistory(history, currentValue) {
  const past = [...history.past, currentValue];
  if (past.length > HISTORY_LIMIT) {
    past.shift();
  }
  return { past, future: [] };
}

export function undo(history, currentValue) {

  if (history.past.length === 0) return null;

  const previous = history.past[history.past.length - 1];

  return {
    value: previous,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, currentValue],
    },
  };
}

export function redo(history, currentValue) {

  if (history.future.length === 0) return null;

  const next = history.future[history.future.length - 1];

  return {
    value: next,
    history: {
      past: [...history.past, currentValue],
      future: history.future.slice(0, -1),
    },
  };
}

export function canUndo(history) {
  return history.past.length > 0;
}

export function canRedo(history) {
  return history.future.length > 0;
}

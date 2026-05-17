/*
 * Tiny undo/redo helpers.
 *
 * A history state is two stacks: `past` snapshots we can undo to and
 * `future` snapshots we can redo to. The current rows live outside this
 * struct (in React state) so the same object can be reused for any state
 * that has a "snapshot" shape.
 *
 * I cap the stack at HISTORY_LIMIT so that long editing sessions don't
 * grow memory forever -- the very oldest snapshots get dropped first.
 */

export const HISTORY_LIMIT = 50;

export function createHistory() {
  return { past: [], future: [] };
}

// Call this BEFORE mutating the current value. It captures the current
// value as a new "past" snapshot and clears the future (any new edit
// invalidates the redo branch, just like every editor you've ever used).
export function pushHistory(history, currentValue) {
  const past = [...history.past, currentValue];
  if (past.length > HISTORY_LIMIT) {
    past.shift(); // drop oldest
  }
  return { past, future: [] };
}

// Returns { value, history } or null if nothing to undo.
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

// Returns { value, history } or null if nothing to redo.
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

// undo/redo history management.
// a history object has two arrays: "past" (states we can go back to)
// and "future" (states we can go forward to after an undo).
//
// only committed row snapshots are stored here — pending drafts are not tracked
// because they disappear on undo anyway.
//
// the stack is capped at HISTORY_LIMIT entries so long editing sessions
// do not grow memory forever. the oldest entry is dropped when the cap is reached.
//
// used by useEditableTable.

export const HISTORY_LIMIT = 50;

// create an empty history with no past or future.
export function createHistory() {
  return { past: [], future: [] };
}

// call this before mutating the current value.
// it saves the current value as a "past" snapshot and clears the future
// (a new edit always cancels the redo branch, just like in any text editor).
export function pushHistory(history, currentValue) {
  const past = [...history.past, currentValue];
  if (past.length > HISTORY_LIMIT) {
    past.shift(); // drop the oldest snapshot to stay within the limit
  }
  return { past, future: [] };
}

// step backward: move the current value into the future and restore the most recent past snapshot.
// returns { value, history } or null if there is nothing to undo.
export function undo(history, currentValue) {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1];
  return {
    value: previous,
    history: {
      past: history.past.slice(0, -1),          // remove the last past entry
      future: [...history.future, currentValue], // push current into future
    },
  };
}

// step forward: move the current value into the past and restore the most recent future snapshot.
// returns { value, history } or null if there is nothing to redo.
export function redo(history, currentValue) {
  if (history.future.length === 0) return null;
  const next = history.future[history.future.length - 1];
  return {
    value: next,
    history: {
      past: [...history.past, currentValue],      // push current into past
      future: history.future.slice(0, -1),        // remove the last future entry
    },
  };
}

// returns true if there is at least one state to undo to.
export function canUndo(history) {
  return history.past.length > 0;
}

// returns true if there is at least one state to redo to.
export function canRedo(history) {
  return history.future.length > 0;
}

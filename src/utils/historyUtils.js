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

/**
 * A pair of stacks that implement undo/redo for any snapshot type T.
 *
 * @template T
 * @typedef {Object} History
 * @property {T[]} past - ordered snapshots; last entry is the most recent
 * @property {T[]} future - snapshots available to redo; last entry is the next one
 */

export const HISTORY_LIMIT = 50;

/**
 * Create an empty history with no past or future entries.
 *
 * @returns {History<*>}
 */
// create an empty history with no past or future.
export function createHistory() {
  return { past: [], future: [] };
}

/**
 * Snapshot `currentValue` into the past stack before mutating it.
 * Clears the future stack because a new edit invalidates any undone branch.
 * Drops the oldest past entry if the stack exceeds HISTORY_LIMIT.
 *
 * @template T
 * @param {History<T>} history
 * @param {T} currentValue
 * @returns {History<T>}
 */
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

/**
 * Step backward: restore the most recent past snapshot.
 * Returns `null` when there is nothing to undo.
 *
 * @template T
 * @param {History<T>} history
 * @param {T} currentValue - the value to push onto the future stack
 * @returns {{ value: T, history: History<T> } | null}
 */
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

/**
 * Step forward: restore the most recent future snapshot.
 * Returns `null` when there is nothing to redo.
 *
 * @template T
 * @param {History<T>} history
 * @param {T} currentValue - the value to push onto the past stack
 * @returns {{ value: T, history: History<T> } | null}
 */
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

/**
 * Return true if there is at least one past snapshot to undo to.
 *
 * @param {History<*>} history
 * @returns {boolean}
 */
// returns true if there is at least one state to undo to.
export function canUndo(history) {
  return history.past.length > 0;
}

/**
 * Return true if there is at least one future snapshot to redo to.
 *
 * @param {History<*>} history
 * @returns {boolean}
 */
// returns true if there is at least one state to redo to.
export function canRedo(history) {
  return history.future.length > 0;
}

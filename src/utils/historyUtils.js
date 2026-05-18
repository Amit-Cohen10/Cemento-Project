// undo/redo history management.
//
// on the website: the user can click "Undo" (or press Ctrl+Z / Cmd+Z) to step back
// through saved states, and "Redo" (Ctrl+Y / Cmd+Y) to step forward again.
// only committed saves are tracked — draft edits that haven't been saved yet are
// not stored here because they disappear automatically when undo is pressed.
//
// how it works — two stacks:
//   "past"   = snapshots of previous states, newest at the end.
//              each entry is the complete rows array at one point in time.
//   "future" = snapshots saved after an undo, so redo can replay them.
//              newest at the end.
//
// the full undo/redo cycle with an example:
//
//   start:     past=[]          current=[alice, bob]   future=[]
//
//   user edits alice's salary and saves:
//   pushHistory is called — saves the OLD current into past before the change:
//              past=[[alice, bob]]   current=[alice*, bob]   future=[]
//
//   user presses Ctrl+Z (undo):
//   undo() is called — moves current into future, restores previous past entry:
//              past=[]   current=[alice, bob]   future=[[alice*, bob]]
//
//   user presses Ctrl+Y (redo):
//   redo() is called — moves current into past, restores the future entry:
//              past=[[alice, bob]]   current=[alice*, bob]   future=[]
//              (back to where we were before the undo)
//
// the stack is capped at HISTORY_LIMIT (50) entries so long editing sessions
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

// maximum number of past snapshots to keep in memory.
// once we have 50 past states, the oldest one is dropped to make room for the new one.
// example: if the user saves 51 times in a row, they can only undo back 50 saves.
export const HISTORY_LIMIT = 50;

/**
 * Create an empty history with no past or future entries.
 *
 * @returns {History<*>}
 */
// creates the initial history object when the table first loads.
// past and future are both empty because there is nothing to undo or redo yet.
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
// call this BEFORE making a change, passing the current (about-to-be-replaced) value.
// the function saves it as a "past" snapshot so the user can get back to it with Ctrl+Z.
//
// it also CLEARS the future stack. why? because once the user makes a new edit,
// the redo branch is gone — just like in any text editor. if you undo "hello" → "hell",
// then type "help", you can no longer redo back to "hello".
//
// example:
//   before: past=[[alice, bob]], future=[[alice*, bob]]   (user had undone something)
//   pushHistory(history, [alice, bob]) is called because user is saving a new change
//   after:  past=[[alice, bob], [alice, bob]], future=[]  (future is wiped)
//
// if the past stack is already at 50 entries, the oldest one is dropped:
//   past = [snapshot1, ..., snapshot50]  →  past = [snapshot2, ..., snapshot50, newSnapshot]
export function pushHistory(history, currentValue) {
  const past = [...history.past, currentValue]; // append current state to the past
  if (past.length > HISTORY_LIMIT) {
    past.shift(); // drop the oldest snapshot (the one at index 0) to stay within the limit
  }
  return { past, future: [] }; // future is always cleared when a new edit is made
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
// step backward in time: restore the most recent past snapshot.
// the current value is saved into the future stack so the user can redo it.
//
// returns { value, history } where:
//   value   = the snapshot to restore as the new current state
//   history = the updated past/future stacks
//
// returns null if there is nothing to undo (the past stack is empty).
//
// example:
//   past=[[alice, bob]]   current=[alice*, bob]   future=[]
//   undo(history, [alice*, bob]) →
//     value   = [alice, bob]           (the state to restore — alice before the edit)
//     history = { past: [], future: [[alice*, bob]] }
//              (past lost its last entry; current was pushed into future for redo)
export function undo(history, currentValue) {
  // nothing in the past — there is nothing to go back to.
  if (history.past.length === 0) return null;

  // grab the most recent past snapshot (last entry in the array).
  const previous = history.past[history.past.length - 1];

  return {
    value: previous, // this becomes the new current state
    history: {
      past: history.past.slice(0, -1),           // remove the last past entry
      future: [...history.future, currentValue],  // push current into future for redo
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
// step forward in time: restore the most recent future snapshot (redo the last undo).
// the current value is saved into the past stack so the user can undo again.
//
// returns { value, history } where:
//   value   = the snapshot to restore as the new current state
//   history = the updated past/future stacks
//
// returns null if there is nothing to redo (the future stack is empty).
//
// example:
//   past=[]   current=[alice, bob]   future=[[alice*, bob]]
//   redo(history, [alice, bob]) →
//     value   = [alice*, bob]        (the state to restore — alice after the edit)
//     history = { past: [[alice, bob]], future: [] }
//              (current was pushed into past; future lost its last entry)
export function redo(history, currentValue) {
  // nothing in the future — there is nothing to redo.
  if (history.future.length === 0) return null;

  // grab the most recent future snapshot (last entry in the array).
  const next = history.future[history.future.length - 1];

  return {
    value: next, // this becomes the new current state
    history: {
      past: [...history.past, currentValue],      // push current into past for undo
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
// returns true when the "Undo" button should be enabled.
// if there are no past snapshots, clicking Undo would do nothing, so the button is greyed out.
export function canUndo(history) {
  return history.past.length > 0;
}

/**
 * Return true if there is at least one future snapshot to redo to.
 *
 * @param {History<*>} history
 * @returns {boolean}
 */
// returns true when the "Redo" button should be enabled.
// if there are no future snapshots (no recent undo was done), the button is greyed out.
export function canRedo(history) {
  return history.future.length > 0;
}

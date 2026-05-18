// utility functions for managing row data.
//
// on the website, the table data goes through a clear lifecycle:
//
//   1. rows load from seed.json (or localStorage if you have saved before).
//      every row must have a unique numeric id like "1", "42", "2500".
//
//   2. while the user edits, changes are stored as "drafts" — a separate
//      object that sits on top of the saved data. the actual row is not touched
//      until the user clicks "Save changes".
//      the orange dot in the corner of a cell = that cell has a draft value.
//
//   3. when the user clicks "Save changes", all drafts are merged into the
//      saved rows, and the result is written to localStorage.
//
// concrete example of the draft cycle:
//   saved row:     { id: "1", name: "Alice", salary: 80000 }
//   user edits name to "Alice Smith" and salary to 85000
//   draftChanges:  { "1": { name: "Alice Smith", salary: 85000 } }
//   the table shows "Alice Smith" / 85000 (from draft)
//   user clicks Save → committedRows: { id: "1", name: "Alice Smith", salary: 85000 }
//   draftChanges is now empty
//
// these are all plain functions (no React). they are used by useEditableTable.

/** @typedef {import('./types.js').Row} Row */
/** @typedef {import('./types.js').DraftChanges} DraftChanges */

// a safe way to check if an object has a property.
// using Object.prototype.hasOwnProperty.call protects against an edge case where
// a column id might accidentally match a built-in JavaScript property name
// like "constructor" or "toString", which would give wrong results with a plain
// "key in object" check.
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// strips everything from a row id except the trailing number.
// this is used internally to normalize ids before checking uniqueness.
// examples:
//   "42"          → "42"    (already a plain number string)
//   "employee-42" → "42"    (legacy format from old exports)
//   "row-5"       → "5"
//   "abc"         → null    (no number found)
function normalizeNumericIdValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const exactNumber = text.match(/^\d+$/);
  if (exactNumber) {
    return String(Number(text));
  }

  // handles legacy ids like "employee-42".
  const trailingNumber = text.match(/(\d+)$/);
  return trailingNumber ? String(Number(trailingNumber[1])) : null;
}

/**
 * Rewrite every row id to a unique numeric string, resolving collisions in order.
 *
 * @param {Row[]} rows
 * @returns {Row[]}
 */
// on the website this runs once when the app loads — it makes sure every row
// in the table has a clean unique numeric id.
//
// why: seed.json might have ids like "employee-1", "employee-2", or duplicate ids
// from a manual edit. the table needs simple numbers ("1", "2", "3") to work
// reliably, especially when adding new rows (we just find the highest number + 1).
//
// example:
//   input:  [{ id: "employee-1", name: "Alice" }, { id: "employee-1", name: "Bob" }]
//   output: [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]
//   (the collision on "1" gives Bob the next available id which is "2")
export function normalizeRowsToUniqueNumericIds(rows) {
  const usedIds = new Set();
  let nextId = 1;

  // pick the next available numeric id that has not been used yet.
  const takeNextId = () => {
    while (usedIds.has(String(nextId))) {
      nextId += 1;
    }
    const id = String(nextId);
    usedIds.add(id);
    nextId += 1;
    return id;
  };

  return rows.map((row) => {
    const candidate = normalizeNumericIdValue(row.id);
    // use the candidate if it is a valid number AND not already taken.
    const id = candidate && !usedIds.has(candidate) ? candidate : takeNextId();
    usedIds.add(id);
    // if the id did not change, return the same object reference to avoid
    // triggering unnecessary React re-renders.
    return row.id === id ? row : { ...row, id };
  });
}

/**
 * Return the next numeric string id — one higher than the current maximum id in the array.
 *
 * @param {Row[]} rows
 * @returns {string}
 */
// when the user clicks "+ Add row", the new row needs a unique id.
// this function scans all existing rows, finds the highest numeric id,
// and returns that number + 1.
//
// example: rows have ids "1", "2", "5", "8" → returns "9"
// if there are no rows yet → returns "1"
export function getNextNumericRowId(rows) {
  let maxId = 0;

  for (const row of rows) {
    const numericId = normalizeNumericIdValue(row.id);
    if (!numericId) continue;
    maxId = Math.max(maxId, Number(numericId));
  }

  return String(maxId + 1);
}

/**
 * Return a new rows array with one cell's value replaced (immutable update).
 *
 * @param {Row[]} rows
 * @param {string} rowId
 * @param {string} columnId
 * @param {*} value
 * @returns {Row[]}
 */
// returns a brand-new array where one specific cell has a new value.
//
// why a new array instead of mutating the existing one:
//   React compares arrays by reference. if we mutate the existing array,
//   React thinks "same reference = nothing changed" and does not re-render.
//   returning a new array guarantees React notices the update.
//
// example:
//   rows = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]
//   updateRowCell(rows, "1", "name", "Alice Smith")
//   → [{ id: "1", name: "Alice Smith" }, { id: "2", name: "Bob" }]
//   (row "2" is the same object reference — only row "1" is a new object)
export function updateRowCell(rows, rowId, columnId, value) {
  return rows.map((row) => {
    if (row.id !== rowId) {
      return row;
    }
    return {
      ...row,
      [columnId]: value,
    };
  });
}

/**
 * Return the draft value for a cell if one exists, otherwise the committed row value.
 *
 * @param {Row} row
 * @param {DraftChanges} draftChanges
 * @param {string} columnId
 * @returns {*}
 */
// this is how every cell in the table decides what to display.
// if the user has edited the cell but not yet saved, show the draft value (with orange dot).
// otherwise show the saved value from committedRows.
//
// example:
//   row = { id: "1", name: "Alice", salary: 80000 }
//   draftChanges = { "1": { name: "Alice Smith" } }  ← user typed a new name
//
//   getDraftCellValue(row, draftChanges, "name")    → "Alice Smith"  (draft wins)
//   getDraftCellValue(row, draftChanges, "salary")  → 80000          (no draft → saved value)
export function getDraftCellValue(row, draftChanges, columnId) {
  const rowDraft = draftChanges[row.id];

  // hasOwn check matters here: the draft might exist but have columnId = undefined,
  // which is different from the key not existing at all.
  if (rowDraft && hasOwn(rowDraft, columnId)) {
    return rowDraft[columnId];
  }

  return row[columnId];
}

/**
 * Return true if the cell has an unsaved draft value.
 *
 * @param {DraftChanges} draftChanges
 * @param {string} rowId
 * @param {string} columnId
 * @returns {boolean}
 */
// used to decide whether to show the orange dot in the corner of a cell.
// returns true when the user has edited this specific cell but not yet saved.
//
// example:
//   draftChanges = { "1": { name: "Alice Smith" } }
//   hasDraftCell(draftChanges, "1", "name")    → true   (orange dot shown)
//   hasDraftCell(draftChanges, "1", "salary")  → false  (no dot — not edited)
//   hasDraftCell(draftChanges, "2", "name")    → false  (row 2 not edited at all)
export function hasDraftCell(draftChanges, rowId, columnId) {
  return Boolean(draftChanges[rowId] && hasOwn(draftChanges[rowId], columnId));
}

/**
 * Write a draft value for one cell; if the new value equals the saved value, remove the draft.
 *
 * @param {DraftChanges} draftChanges
 * @param {string} rowId
 * @param {string} columnId
 * @param {*} value
 * @param {*} savedValue - the committed value to compare against
 * @returns {DraftChanges}
 */
// the core of the editing system. called every time a user finishes editing a cell.
//
// two cases:
//   a) the new value is DIFFERENT from the saved value
//      → add or update the draft so the cell shows the orange unsaved dot
//      example: saved name = "Alice", user types "Alice Smith"
//               draftChanges becomes: { "1": { name: "Alice Smith" } }
//
//   b) the new value is THE SAME as the saved value
//      → remove the draft (no point marking a cell as "changed" if it wasn't)
//      example: saved name = "Alice", user types "Alice", then "Alice" again
//               the draft is removed so the orange dot disappears
//
// uses Object.is() instead of === so that special cases like NaN and -0 are handled correctly.
export function setDraftCell(draftChanges, rowId, columnId, value, savedValue) {
  if (Object.is(value, savedValue)) {
    // value was not actually changed — clean up the draft so no orange dot appears.
    return removeDraftCell(draftChanges, rowId, columnId);
  }

  // add or update the draft value for this specific cell.
  return {
    ...draftChanges,
    [rowId]: {
      ...draftChanges[rowId],  // keep any other drafts for this row
      [columnId]: value,
    },
  };
}

/**
 * Remove the draft for one cell; also removes the row entry when no dirty cells remain.
 *
 * @param {DraftChanges} draftChanges
 * @param {string} rowId
 * @param {string} columnId
 * @returns {DraftChanges}
 */
// removes the draft for one cell — called when the user cancels an edit on a specific cell,
// or when they type back the original value (so we don't show a false "unsaved" marker).
//
// also cleans up the row entry in draftChanges if this was the last dirty cell in that row.
// example:
//   before: draftChanges = { "1": { name: "Alice Smith", salary: 85000 } }
//   user cancels the name edit
//   after:  draftChanges = { "1": { salary: 85000 } }
//
//   before: draftChanges = { "1": { name: "Alice Smith" } }
//   user cancels the name edit (only dirty cell)
//   after:  draftChanges = {}   ← row entry removed entirely (clean = no memory waste)
export function removeDraftCell(draftChanges, rowId, columnId) {
  if (!draftChanges[rowId]) {
    // this row has no drafts at all — nothing to remove.
    return draftChanges;
  }

  const nextRowDraft = { ...draftChanges[rowId] };
  delete nextRowDraft[columnId];

  // if the row has no more dirty cells, remove the whole row entry from draftChanges.
  if (Object.keys(nextRowDraft).length === 0) {
    const nextDraftChanges = { ...draftChanges };
    delete nextDraftChanges[rowId];
    return nextDraftChanges;
  }

  return {
    ...draftChanges,
    [rowId]: nextRowDraft,
  };
}

/**
 * Overlay all draft cell values onto the committed rows (called as part of "Save changes").
 *
 * @param {Row[]} rows
 * @param {DraftChanges} draftChanges
 * @returns {Row[]}
 */
// merges all draft values into the actual row objects.
// this is called as the final step of "Save changes".
//
// example:
//   rows = [{ id: "1", name: "Alice", salary: 80000 }, { id: "2", name: "Bob", salary: 70000 }]
//   draftChanges = { "1": { name: "Alice Smith", salary: 85000 } }
//
//   result: [{ id: "1", name: "Alice Smith", salary: 85000 }, { id: "2", name: "Bob", salary: 70000 }]
//   (row "2" is untouched — the spread on an undefined rowDraft does nothing)
export function applyDraftChanges(rows, draftChanges) {
  return rows.map((row) => {
    const rowDraft = draftChanges[row.id];
    if (!rowDraft) {
      return row; // this row has no unsaved changes — return the original object unchanged.
    }
    // spread the draft values on top of the saved row. draft keys win over saved keys.
    return {
      ...row,      // saved values (e.g. id, team, location, ...)
      ...rowDraft, // unsaved edits (e.g. name, salary) — override the saved values
    };
  });
}

/**
 * Count the total number of individual dirty cells across all rows.
 *
 * @param {DraftChanges} draftChanges
 * @returns {number}
 */
// counts the total number of individual cells that have unsaved changes.
// shown in the toolbar tooltip: "3 edited cells, 1 new row, 0 deletions".
//
// example:
//   draftChanges = { "1": { name: "Alice Smith", salary: 85000 }, "3": { role: "Lead" } }
//   → 3 dirty cells (name + salary for row 1, role for row 3)
export function countDraftCells(draftChanges) {
  return Object.values(draftChanges).reduce(
    (total, rowDraft) => total + Object.keys(rowDraft).length,
    0,
  );
}

/**
 * Build the display row list: pending-new rows first, committed rows with deletions removed.
 * Returns the same `committedRows` reference when nothing is pending (no-op fast path).
 *
 * @param {Row[]} committedRows
 * @param {Row[]} pendingNewRows
 * @param {Set<string>} pendingDeletedIds
 * @returns {Row[]}
 */
// builds the list of rows the table actually renders.
// this runs on every state change and must be fast (2,500 rows).
//
// the result is:
//   [new rows added but not yet saved]  ← appear at the top with a "new" badge
//   [committed rows, minus any deleted] ← deleted rows are hidden until Save is clicked
//
// example — after user adds a new row and deletes row "5":
//   committedRows    = [{ id:"1" }, { id:"2" }, { id:"5" }, { id:"6" }]
//   pendingNewRows   = [{ id:"2501" }]          ← new unsaved row
//   pendingDeletedIds = Set(["5"])               ← row 5 hidden until Save
//
//   result: [{ id:"2501" }, { id:"1" }, { id:"2" }, { id:"6" }]
//   (row 5 is gone from the display, new row is at the top)
//
// fast path: if nothing is pending, returns committedRows unchanged (same reference)
// so React.memo components do not re-render when nothing actually changed.
export function mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds) {
  if (
    pendingNewRows.length === 0 &&
    (!pendingDeletedIds || pendingDeletedIds.size === 0)
  ) {
    return committedRows; // fast path — nothing to merge
  }

  // hide rows that the user deleted but has not yet saved.
  const visibleCommitted = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  // new rows go at the top so the user can see what they just added.
  return [...pendingNewRows, ...visibleCommitted];
}

/**
 * Permanently apply all pending changes to produce the new committed rows array.
 * Called once when the user clicks "Save changes".
 *
 * @param {Row[]} committedRows
 * @param {DraftChanges} draftChanges
 * @param {Row[]} pendingNewRows
 * @param {Set<string>} pendingDeletedIds
 * @returns {Row[]}
 */
// this is what "Save changes" does to the data in three steps:
//
//   step 1: remove rows that were marked for deletion
//           committed [1,2,3,4,5] + pendingDeletedIds {3,5} → remaining [1,2,4]
//
//   step 2: add new rows at the top
//           pendingNewRows [2501,2502] + remaining [1,2,4] → [2501,2502,1,2,4]
//
//   step 3: apply all draft cell edits (name changes, salary changes, etc.)
//           draftChanges { "1": { name: "Alice Smith" } } → row 1 name updated in place
//
// after this function the result becomes the new committedRows, and draftChanges,
// pendingNewRows, and pendingDeletedIds are all cleared to empty.
export function commitPendingChanges(
  committedRows,
  draftChanges,
  pendingNewRows,
  pendingDeletedIds,
) {
  // step 1: remove deleted rows permanently.
  const remaining = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  // step 2: prepend new rows so they become permanent at the top.
  const withNewRows = pendingNewRows.length > 0
    ? [...pendingNewRows, ...remaining]
    : remaining;

  // step 3: apply all draft cell values on top of the merged row list.
  return applyDraftChanges(withNewRows, draftChanges);
}

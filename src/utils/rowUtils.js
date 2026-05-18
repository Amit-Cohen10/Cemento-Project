// utility functions for managing row data.
// they handle four things:
//   1. normalizing row ids so they are unique numeric strings
//   2. reading and writing draft (unsaved) cell values
//   3. merging committed rows with pending additions and deletions for display
//   4. committing all pending changes when the user clicks "Save changes"
//
// these are all plain functions (no React). they are used by useEditableTable.

/** @typedef {import('./types.js').Row} Row */
/** @typedef {import('./types.js').DraftChanges} DraftChanges */

// a safe way to check if an object has a property.
// using Object.prototype.hasOwnProperty.call protects against edge cases
// where a column id might clash with a built-in JavaScript property name
// like "constructor" or "toString".
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// strips everything from a row id except the trailing number.
// "42" -> "42", "employee-42" -> "42", "abc" -> null.
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
// takes an array of rows and returns a new array where every row has a unique numeric string id.
// if two rows end up with the same number, the second one gets the next available number.
export function normalizeRowsToUniqueNumericIds(rows) {
  const usedIds = new Set();
  let nextId = 1;

  const takeNextId = () => {
    // skip any number that is already taken.
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
    const id = candidate && !usedIds.has(candidate) ? candidate : takeNextId();
    usedIds.add(id);
    // if the id did not change, return the same object reference (avoids unnecessary re-renders).
    return row.id === id ? row : { ...row, id };
  });
}

/**
 * Return the next numeric string id — one higher than the current maximum id in the array.
 *
 * @param {Row[]} rows
 * @returns {string}
 */
// returns the next available numeric id (one higher than the current maximum).
// used when the user clicks "+ Add row".
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
// return a new array with one cell updated.
// we create a new array (instead of mutating the existing one) because React
// only re-renders when it sees a new reference — mutating does not trigger a re-render.
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
// returns the draft value for a cell if one exists, otherwise the saved value from the row.
export function getDraftCellValue(row, draftChanges, columnId) {
  const rowDraft = draftChanges[row.id];

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
// returns true if this cell has an unsaved draft value.
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
// write a draft value for one cell.
// if the new value is the same as the saved value, we remove the draft instead
// so the "unsaved" orange dot does not appear when nothing actually changed.
export function setDraftCell(draftChanges, rowId, columnId, value, savedValue) {
  if (Object.is(value, savedValue)) {
    return removeDraftCell(draftChanges, rowId, columnId);
  }

  return {
    ...draftChanges,
    [rowId]: {
      ...draftChanges[rowId],
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
// remove the draft for one cell.
// if the row has no more dirty cells after this, we also remove the row entry
// to keep the draftChanges object clean.
export function removeDraftCell(draftChanges, rowId, columnId) {
  if (!draftChanges[rowId]) {
    return draftChanges;
  }

  const nextRowDraft = { ...draftChanges[rowId] };
  delete nextRowDraft[columnId];

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
// overlay all draft values onto the saved rows.
// called once as part of "Save changes".
export function applyDraftChanges(rows, draftChanges) {
  return rows.map((row) => {
    const rowDraft = draftChanges[row.id];
    if (!rowDraft) {
      return row; // nothing changed for this row
    }
    // spread the draft values on top of the saved row values.
    return {
      ...row,
      ...rowDraft,
    };
  });
}

/**
 * Count the total number of individual dirty cells across all rows.
 *
 * @param {DraftChanges} draftChanges
 * @returns {number}
 */
// count the total number of individual dirty cells (not rows).
// shown in the toolbar tooltip so the user knows exactly how many edits are pending.
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
// build the display list the table renders: pending-new rows at the top,
// then committed rows with deleted ones removed.
// only committedRows is saved to localStorage — everything else is temporary.
export function mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds) {
  // fast path: nothing pending, return the committed rows as-is.
  if (
    pendingNewRows.length === 0 &&
    (!pendingDeletedIds || pendingDeletedIds.size === 0)
  ) {
    return committedRows;
  }

  // hide rows that are marked for deletion.
  const visibleCommitted = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  // new rows appear at the top.
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
// permanently apply all pending changes to committedRows.
// called once when the user clicks "Save changes".
export function commitPendingChanges(
  committedRows,
  draftChanges,
  pendingNewRows,
  pendingDeletedIds,
) {
  // remove deleted rows.
  const remaining = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  // prepend new rows.
  const withNewRows = pendingNewRows.length > 0
    ? [...pendingNewRows, ...remaining]
    : remaining;

  // apply all draft cell changes on top.
  return applyDraftChanges(withNewRows, draftChanges);
}

// Object.prototype.hasOwnProperty.call protects us if someone (somehow) has
// a column id called "constructor" or "toString". Using the prototype method
// directly is safer than row.hasOwnProperty(...) on an unknown object.
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeNumericIdValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const exactNumber = text.match(/^\d+$/);
  if (exactNumber) {
    return String(Number(text));
  }

  // Migration path for older demo rows such as "employee-42".
  const trailingNumber = text.match(/(\d+)$/);
  return trailingNumber ? String(Number(trailingNumber[1])) : null;
}

// Keep row ids as strings (matching the PDF schema) while making their
// visible value numeric-only and unique.
export function normalizeRowsToUniqueNumericIds(rows) {
  const usedIds = new Set();
  let nextId = 1;

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
    const id = candidate && !usedIds.has(candidate) ? candidate : takeNextId();
    usedIds.add(id);

    return row.id === id ? row : { ...row, id };
  });
}

export function getNextNumericRowId(rows) {
  let maxId = 0;

  for (const row of rows) {
    const numericId = normalizeNumericIdValue(row.id);
    if (!numericId) continue;
    maxId = Math.max(maxId, Number(numericId));
  }

  return String(maxId + 1);
}

// Return a new rows array with one cell updated.
// Immutable on purpose: React only re-renders if it sees a new reference.
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

// If a draft value exists for this cell, show that; otherwise fall back to
// the saved value on the row.
export function getDraftCellValue(row, draftChanges, columnId) {
  const rowDraft = draftChanges[row.id];

  if (rowDraft && hasOwn(rowDraft, columnId)) {
    return rowDraft[columnId];
  }

  return row[columnId];
}

// Does this cell have an unsaved value?
export function hasDraftCell(draftChanges, rowId, columnId) {
  return Boolean(draftChanges[rowId] && hasOwn(draftChanges[rowId], columnId));
}

// Write a draft value for one cell.
// If the new value matches the saved one, we drop the draft instead, so the
// "unsaved" indicator only shows up when the value really changed.
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

// Remove a single draft cell without touching other dirty cells in the row.
// If the row has no dirty cells left, drop the row entry too.
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

// Merge all draft cells back into the saved rows. Called from "Save changes".
export function applyDraftChanges(rows, draftChanges) {
  return rows.map((row) => {
    const rowDraft = draftChanges[row.id];

    if (!rowDraft) {
      return row;
    }

    return {
      ...row,
      ...rowDraft,
    };
  });
}

// Count the total number of dirty cells (not dirty rows). I show this in the
// toolbar so the user knows exactly how many edits are waiting to be saved.
export function countDraftCells(draftChanges) {
  return Object.values(draftChanges).reduce(
    (total, rowDraft) => total + Object.keys(rowDraft).length,
    0,
  );
}

// Build the visible rows list from the committed state plus any pending
// additions / deletions. The user sees this merged view, but only the
// committed slice is what we save to localStorage.
//
// Pending new rows go first so they appear at the top of the table.
// Pending deleted ids are filtered out of the committed rows.
export function mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds) {
  if (
    pendingNewRows.length === 0 &&
    (!pendingDeletedIds || pendingDeletedIds.size === 0)
  ) {
    return committedRows;
  }

  const visibleCommitted = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  return [...pendingNewRows, ...visibleCommitted];
}

// Promote every pending change into the saved rows: drop deletions, prepend
// new rows, and overlay draft cell values. Called once when the user hits
// "Save changes".
export function commitPendingChanges(
  committedRows,
  draftChanges,
  pendingNewRows,
  pendingDeletedIds,
) {
  const remaining = pendingDeletedIds && pendingDeletedIds.size > 0
    ? committedRows.filter((row) => !pendingDeletedIds.has(row.id))
    : committedRows;

  const withNewRows = pendingNewRows.length > 0
    ? [...pendingNewRows, ...remaining]
    : remaining;

  return applyDraftChanges(withNewRows, draftChanges);
}

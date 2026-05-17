// Object.prototype.hasOwnProperty.call protects us if someone (somehow) has
// a column id called "constructor" or "toString". Using the prototype method
// directly is safer than row.hasOwnProperty(...) on an unknown object.
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
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

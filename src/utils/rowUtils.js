function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// Updates one cell and returns a new rows array.
// This is intentionally immutable so React can detect the state change.
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

// Reads a value from drafts first, then falls back to the saved row.
export function getDraftCellValue(row, draftChanges, columnId) {
  const rowDraft = draftChanges[row.id];

  if (rowDraft && hasOwn(rowDraft, columnId)) {
    return rowDraft[columnId];
  }

  return row[columnId];
}

// Checks if one cell has a local unsaved value.
export function hasDraftCell(draftChanges, rowId, columnId) {
  return Boolean(draftChanges[rowId] && hasOwn(draftChanges[rowId], columnId));
}

// Adds or removes a draft value.
// If the draft matches the saved value, it is removed to keep the dirty state honest.
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

// Removes one draft cell without touching other dirty cells.
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

// Applies all dirty cells to the saved rows.
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

// Counts dirty cells, not dirty rows.
export function countDraftCells(draftChanges) {
  return Object.values(draftChanges).reduce(
    (total, rowDraft) => total + Object.keys(rowDraft).length,
    0,
  );
}

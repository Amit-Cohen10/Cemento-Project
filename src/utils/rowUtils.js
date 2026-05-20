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

  const trailingNumber = text.match(/(\d+)$/);
  return trailingNumber ? String(Number(trailingNumber[1])) : null;
}

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

export function getDraftCellValue(row, draftChanges, columnId) {
  const rowDraft = draftChanges[row.id];

  if (rowDraft && hasOwn(rowDraft, columnId)) {
    return rowDraft[columnId];
  }

  return row[columnId];
}

export function hasDraftCell(draftChanges, rowId, columnId) {
  return Boolean(draftChanges[rowId] && hasOwn(draftChanges[rowId], columnId));
}

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

export function countDraftCells(draftChanges) {
  return Object.values(draftChanges).reduce(
    (total, rowDraft) => total + Object.keys(rowDraft).length,
    0,
  );
}

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

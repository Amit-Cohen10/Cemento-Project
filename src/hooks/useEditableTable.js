import { useCallback, useEffect, useMemo, useState } from "react";
import {
  reconcileVisibleColumnIds,
  toggleColumnId,
} from "../utils/columnUtils.js";
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  pushHistory,
  redo as historyRedo,
  undo as historyUndo,
} from "../utils/historyUtils.js";
import {
  commitPendingChanges,
  countDraftCells,
  getDraftCellValue,
  hasDraftCell,
  mergePendingRows,
  removeDraftCell,
  setDraftCell,
} from "../utils/rowUtils.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

const STORAGE_KEY_ROWS = "data";
const STORAGE_KEY_COLUMNS = "columns";

function createDefaultRowId() {
  return `row-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

function identityRows(rows) {
  return rows;
}

export function useEditableTable(initialRows, initialColumnIds, options = {}) {
  const {
    createRowId = createDefaultRowId,
    normalizeRows = identityRows,
  } = options;

  const [committedRows, setCommittedRows] = useState(() =>
    normalizeRows(loadFromStorage(STORAGE_KEY_ROWS, initialRows)),
  );

  const [draftChanges, setDraftChanges] = useState({});

  const [pendingNewRows, setPendingNewRows] = useState([]);

  const [pendingDeletedIds, setPendingDeletedIds] = useState(() => new Set());

  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    reconcileVisibleColumnIds(
      loadFromStorage(STORAGE_KEY_COLUMNS, initialColumnIds),
      initialColumnIds,
    ),
  );

  const [editingCell, setEditingCell] = useState(null);

  const [history, setHistory] = useState(() => createHistory());

  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

  useEffect(() => {
    saveToStorage(STORAGE_KEY_ROWS, committedRows);
  }, [committedRows]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_COLUMNS, visibleColumnIds);
  }, [visibleColumnIds]);

  const rows = useMemo(
    () => mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds),
    [committedRows, pendingNewRows, pendingDeletedIds],
  );

  const rowsById = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  const pendingNewRowIds = useMemo(() => {
    const ids = new Set();
    for (const row of pendingNewRows) {
      ids.add(row.id);
    }
    return ids;
  }, [pendingNewRows]);

  const draftCellCount = useMemo(() => countDraftCells(draftChanges), [draftChanges]);
  const pendingChangesCount =
    draftCellCount + pendingNewRows.length + pendingDeletedIds.size;

  const hasUnsavedChanges = pendingChangesCount > 0;

  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumnIds((currentIds) => toggleColumnId(currentIds, columnId));
    setEditingCell((current) => (current?.columnId === columnId ? null : current));
  }, []);

  const replaceVisibleColumnIds = useCallback((nextIds) => {
    setVisibleColumnIds(nextIds);
    setEditingCell((current) => {
      if (!current) return null;

      return nextIds.includes(current.columnId) ? current : null;
    });
  }, []);

  const startEditing = useCallback((rowId, columnId) => {
    setEditingCell({ rowId, columnId });
  }, []);

  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const updateDraftCell = useCallback(
    (rowId, columnId, value) => {
      const savedRow = rowsById.get(rowId);
      const savedValue = savedRow ? savedRow[columnId] : undefined;
      setDraftChanges((currentDrafts) =>
        setDraftCell(currentDrafts, rowId, columnId, value, savedValue),
      );
    },
    [rowsById],
  );

  const cancelCellEdit = useCallback((rowId, columnId) => {
    setDraftChanges((currentDrafts) => removeDraftCell(currentDrafts, rowId, columnId));
    setEditingCell(null);
  }, []);

  const getCellValue = useCallback(
    (row, columnId) => getDraftCellValue(row, draftChanges, columnId),
    [draftChanges],
  );

  const isCellDirty = useCallback(
    (rowId, columnId) => hasDraftCell(draftChanges, rowId, columnId),
    [draftChanges],
  );

  const saveChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;

    setCommittedRows((current) => {

      setHistory((h) => pushHistory(h, current));
      return commitPendingChanges(current, draftChanges, pendingNewRows, pendingDeletedIds);
    });
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, [draftChanges, pendingNewRows, pendingDeletedIds, hasUnsavedChanges]);

  const discardChanges = useCallback(() => {
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, []);

  const addRow = useCallback(() => {
    setPendingNewRows((current) => {

      const baseline = mergePendingRows(committedRows, current, pendingDeletedIds);
      const newRow = { id: createRowId(baseline) };
      return [newRow, ...current];
    });
  }, [committedRows, createRowId, pendingDeletedIds]);

  const deleteRow = useCallback((rowId) => {
    const isPendingNew = pendingNewRows.some((row) => row.id === rowId);

    if (isPendingNew) {
      setPendingNewRows((current) => current.filter((row) => row.id !== rowId));
    } else {
      setPendingDeletedIds((current) => {
        if (current.has(rowId)) return current;
        const next = new Set(current);
        next.add(rowId);
        return next;
      });
    }

    setDraftChanges((currentDrafts) => {
      if (!currentDrafts[rowId]) return currentDrafts;
      const next = { ...currentDrafts };
      delete next[rowId];
      return next;
    });

    setEditingCell((current) => (current?.rowId === rowId ? null : current));

    setSelectedRowIds((current) => {
      if (!current.has(rowId)) return current;
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }, [pendingNewRows]);

  const toggleRowSelection = useCallback((rowId) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const setSelectionForVisible = useCallback((visibleRowIds, shouldSelect) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      visibleRowIds.forEach((id) => {
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const bulkUpdateField = useCallback(
    (columnId, value) => {
      if (selectedRowIds.size === 0) return;
      setDraftChanges((currentDrafts) => {
        let next = currentDrafts;
        for (const rowId of selectedRowIds) {
          const savedRow = rowsById.get(rowId);
          const savedValue = savedRow ? savedRow[columnId] : undefined;
          next = setDraftCell(next, rowId, columnId, value, savedValue);
        }
        return next;
      });

      setEditingCell((current) =>
        current && current.columnId === columnId && selectedRowIds.has(current.rowId)
          ? null
          : current,
      );
    },
    [selectedRowIds, rowsById],
  );

  const deleteSelectedRows = useCallback(() => {
    if (selectedRowIds.size === 0) return;

    const newRowIdSet = new Set(pendingNewRows.map((row) => row.id));
    const idsToRemoveFromNew = [];
    const idsToMarkDeleted = [];
    for (const id of selectedRowIds) {
      if (newRowIdSet.has(id)) {
        idsToRemoveFromNew.push(id);
      } else {
        idsToMarkDeleted.push(id);
      }
    }

    if (idsToRemoveFromNew.length > 0) {
      const toDrop = new Set(idsToRemoveFromNew);
      setPendingNewRows((currentNew) => currentNew.filter((row) => !toDrop.has(row.id)));
    }

    if (idsToMarkDeleted.length > 0) {
      setPendingDeletedIds((current) => {
        const next = new Set(current);
        for (const id of idsToMarkDeleted) {
          next.add(id);
        }
        return next;
      });
    }

    setDraftChanges((currentDrafts) => {
      let changed = false;
      const next = { ...currentDrafts };
      for (const id of selectedRowIds) {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : currentDrafts;
    });

    setEditingCell((current) =>
      current && selectedRowIds.has(current.rowId) ? null : current,
    );

    setSelectedRowIds(new Set());
  }, [selectedRowIds, pendingNewRows]);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyUndo(currentHistory, committedRows);
      if (!result) return currentHistory;
      setCommittedRows(result.value);
      setDraftChanges({});
      setPendingNewRows([]);
      setPendingDeletedIds(new Set());
      setEditingCell(null);
      return result.history;
    });
  }, [committedRows]);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyRedo(currentHistory, committedRows);
      if (!result) return currentHistory;
      setCommittedRows(result.value);
      setDraftChanges({});
      setPendingNewRows([]);
      setPendingDeletedIds(new Set());
      setEditingCell(null);
      return result.history;
    });
  }, [committedRows]);

  const canUndo = historyCanUndo(history);
  const canRedo = historyCanRedo(history);

  return {
    rows,
    visibleColumnIds,
    editingCell,
    draftCellCount,
    pendingNewRowCount: pendingNewRows.length,
    pendingDeletedCount: pendingDeletedIds.size,
    pendingChangesCount,
    hasUnsavedChanges,
    pendingNewRowIds,
    toggleColumnVisibility,
    replaceVisibleColumnIds,
    startEditing,
    stopEditing,
    updateDraftCell,
    cancelCellEdit,
    getCellValue,
    isCellDirty,
    saveChanges,
    discardChanges,
    addRow,
    deleteRow,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedRowIds,
    toggleRowSelection,
    setSelectionForVisible,
    clearSelection,
    deleteSelectedRows,
    bulkUpdateField,
  };
}

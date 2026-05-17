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

/*
 * Keeps all the table state in one place.
 *
 * The hook holds four kinds of state and merges them into one display list:
 *
 *   - committedRows  -> The saved data. This is what we persist to
 *                       localStorage and what survives a refresh.
 *   - draftChanges   -> Cell-level edits that haven't been saved yet.
 *   - pendingNewRows -> Rows the user added but hasn't saved yet.
 *   - pendingDeletedIds -> Saved rows the user marked for deletion but
 *                          hasn't saved yet.
 *
 * The "rows" the table displays is the merge of all four. Only "Save
 * changes" promotes the pending state into committedRows (and storage).
 * "Cancel" drops everything pending.
 *
 * Undo/redo history is in-memory only and tracks just the committed
 * snapshots, because that's the only state that crosses a refresh.
 */
export function useEditableTable(initialRows, initialColumnIds, options = {}) {
  const {
    createRowId = createDefaultRowId,
    normalizeRows = identityRows,
  } = options;

  // Hydrate from localStorage first so refreshing the page keeps saved edits.
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
  // Selected row ids. A Set gives O(1) has() lookup from the row component.
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

  // Persist only the COMMITTED state. Drafts and pending row changes are
  // by definition unsaved and shouldn't leak into the next session.
  useEffect(() => {
    saveToStorage(STORAGE_KEY_ROWS, committedRows);
  }, [committedRows]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_COLUMNS, visibleColumnIds);
  }, [visibleColumnIds]);

  // The list the table actually renders.
  const rows = useMemo(
    () => mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds),
    [committedRows, pendingNewRows, pendingDeletedIds],
  );

  // Build a Map from rowId to row so reads are O(1).
  // Without this, every keystroke would do rows.find() which is O(n).
  const rowsById = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  // Set of new row ids -- handy for showing a "new" badge in the cell UI.
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
    // If the user hides the column they're editing, stop editing so we don't
    // leave a stale editingCell pointing at a hidden column.
    setEditingCell((current) => (current?.columnId === columnId ? null : current));
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

  // Save: collapse every pending change into committedRows + history.
  // After this the user is back to a clean state.
  const saveChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;

    setCommittedRows((current) => {
      // Snapshot the previous committed state for undo before mutating.
      setHistory((h) => pushHistory(h, current));
      return commitPendingChanges(current, draftChanges, pendingNewRows, pendingDeletedIds);
    });
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, [draftChanges, pendingNewRows, pendingDeletedIds, hasUnsavedChanges]);

  // Cancel: throw away every pending change. Saved rows are untouched.
  const discardChanges = useCallback(() => {
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, []);

  // Add a new empty row. Stays in pendingNewRows until the user saves.
  // The cells render "Not set" until clicked and edited.
  const addRow = useCallback(() => {
    setPendingNewRows((current) => {
      // Pass the merged "all rows so far" to createRowId so the new id is
      // unique vs. both committed rows and other pending new rows.
      const baseline = mergePendingRows(committedRows, current, pendingDeletedIds);
      const newRow = { id: createRowId(baseline) };
      return [newRow, ...current];
    });
  }, [committedRows, createRowId, pendingDeletedIds]);

  // Delete a row. Two cases:
  //   1) It's a pending new row -> just unstage it (it never existed in
  //      committed state, so there's nothing to remember).
  //   2) It's a committed row -> add to pendingDeletedIds.
  const deleteRow = useCallback((rowId) => {
    let removedFromPendingNew = false;
    setPendingNewRows((current) => {
      const next = current.filter((row) => row.id !== rowId);
      removedFromPendingNew = next.length !== current.length;
      return removedFromPendingNew ? next : current;
    });

    if (!removedFromPendingNew) {
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
  }, []);

  // Selection helpers.
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

  // Select / unselect every row in the given list (typically the filtered
  // view from DataTable).
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

  // Bulk delete: routes each selected row through the same pending-aware
  // delete logic.
  const deleteSelectedRows = useCallback(() => {
    if (selectedRowIds.size === 0) return;

    const idsToRemoveFromNew = [];
    const idsToMarkDeleted = [];

    setPendingNewRows((currentNew) => {
      const newSet = new Set(currentNew.map((row) => row.id));
      for (const id of selectedRowIds) {
        if (newSet.has(id)) {
          idsToRemoveFromNew.push(id);
        } else {
          idsToMarkDeleted.push(id);
        }
      }
      if (idsToRemoveFromNew.length === 0) return currentNew;
      const toDrop = new Set(idsToRemoveFromNew);
      return currentNew.filter((row) => !toDrop.has(row.id));
    });

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
  }, [selectedRowIds]);

  // Undo / redo: walk the committedRows snapshot stack. Pending changes are
  // dropped because they no longer make sense for the rolled-back data.
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
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { toggleColumnId } from "../utils/columnUtils.js";
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  pushHistory,
  redo as historyRedo,
  undo as historyUndo,
} from "../utils/historyUtils.js";
import {
  applyDraftChanges,
  countDraftCells,
  getDraftCellValue,
  hasDraftCell,
  removeDraftCell,
  setDraftCell,
} from "../utils/rowUtils.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

const STORAGE_KEY_ROWS = "data";
const STORAGE_KEY_COLUMNS = "columns";

/*
 * Keeps all the table state in one place: saved rows, draft (unsaved) cells,
 * which columns are visible, and which cell is currently being edited.
 *
 * Saved rows and visible columns are persisted to localStorage, so a browser
 * refresh keeps the user's changes. Drafts are intentionally NOT persisted --
 * they are unsaved by definition.
 *
 * Undo/redo history is in-memory only. I don't persist the stacks because
 * (a) they can be large, and (b) a fresh session starting "clean" is the
 * expected behaviour in most apps.
 */
export function useEditableTable(initialRows, initialColumnIds) {
  // Hydrate from localStorage first so refreshing the page keeps saved edits.
  const [rows, setRows] = useState(() =>
    loadFromStorage(STORAGE_KEY_ROWS, initialRows),
  );
  const [draftChanges, setDraftChanges] = useState({});
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    loadFromStorage(STORAGE_KEY_COLUMNS, initialColumnIds),
  );
  const [editingCell, setEditingCell] = useState(null);
  const [history, setHistory] = useState(() => createHistory());
  // Selected row ids. A Set gives O(1) has() lookup from the row component.
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

  // Whenever rows actually change (save, add, delete, undo, redo), mirror
  // them to storage.
  useEffect(() => {
    saveToStorage(STORAGE_KEY_ROWS, rows);
  }, [rows]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_COLUMNS, visibleColumnIds);
  }, [visibleColumnIds]);

  // Build a Map from rowId to row so reads are O(1).
  // Without this, every keystroke would do rows.find() which is O(n).
  const rowsById = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  const draftCellCount = useMemo(() => countDraftCells(draftChanges), [draftChanges]);
  const hasUnsavedChanges = draftCellCount > 0;

  // Wrapper around setRows that snapshots the previous rows into the undo
  // stack. Used by every "user action" that modifies saved data.
  const commitRowsWithHistory = useCallback((nextRows) => {
    setRows((currentRows) => {
      setHistory((h) => pushHistory(h, currentRows));
      return typeof nextRows === "function" ? nextRows(currentRows) : nextRows;
    });
  }, []);

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

  const saveChanges = useCallback(() => {
    commitRowsWithHistory((currentRows) => applyDraftChanges(currentRows, draftChanges));
    setDraftChanges({});
    setEditingCell(null);
  }, [commitRowsWithHistory, draftChanges]);

  const discardChanges = useCallback(() => {
    setDraftChanges({});
    setEditingCell(null);
  }, []);

  // Add a new empty row at the top. The cells render "Not set" until the
  // user clicks them and types a value.
  const addRow = useCallback(() => {
    const newRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    };
    commitRowsWithHistory((currentRows) => [newRow, ...currentRows]);
  }, [commitRowsWithHistory]);

  // Remove a row by id and clean up any drafts / editing state pointing at it.
  const deleteRow = useCallback(
    (rowId) => {
      commitRowsWithHistory((currentRows) => currentRows.filter((row) => row.id !== rowId));
      setDraftChanges((currentDrafts) => {
        if (!currentDrafts[rowId]) {
          return currentDrafts;
        }
        const next = { ...currentDrafts };
        delete next[rowId];
        return next;
      });
      setEditingCell((current) => (current?.rowId === rowId ? null : current));
    },
    [commitRowsWithHistory],
  );

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
  // view from DataTable). Keeps selections on rows NOT in the list, so
  // hiding a filter doesn't lose selections you can't currently see.
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

  // Bulk delete every selected row. Goes through history like other
  // destructive actions, so an accidental delete can be undone.
  const deleteSelectedRows = useCallback(() => {
    if (selectedRowIds.size === 0) return;
    commitRowsWithHistory((currentRows) =>
      currentRows.filter((row) => !selectedRowIds.has(row.id)),
    );
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
  }, [commitRowsWithHistory, selectedRowIds]);

  // Undo / redo: swap the current rows with the top of the past/future stack.
  // We also drop unsaved drafts -- they may not make sense for the rolled-
  // back data set.
  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyUndo(currentHistory, rows);
      if (!result) return currentHistory;
      setRows(result.value);
      setDraftChanges({});
      setEditingCell(null);
      return result.history;
    });
  }, [rows]);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyRedo(currentHistory, rows);
      if (!result) return currentHistory;
      setRows(result.value);
      setDraftChanges({});
      setEditingCell(null);
      return result.history;
    });
  }, [rows]);

  const canUndo = historyCanUndo(history);
  const canRedo = historyCanRedo(history);

  return {
    rows,
    visibleColumnIds,
    editingCell,
    draftCellCount,
    hasUnsavedChanges,
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { toggleColumnId } from "../utils/columnUtils.js";
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
 * I put it in a custom hook so DataTable.jsx stays focused on the UI.
 *
 * Saved rows and visible columns are persisted to localStorage, so a browser
 * refresh keeps the user's changes. Drafts are intentionally NOT persisted --
 * they are unsaved by definition.
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

  // Whenever rows actually change (save, add, delete), mirror them to storage.
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
    setRows((currentRows) => applyDraftChanges(currentRows, draftChanges));
    setDraftChanges({});
    setEditingCell(null);
  }, [draftChanges]);

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
    setRows((currentRows) => [newRow, ...currentRows]);
  }, []);

  // Remove a row by id and clean up any drafts / editing state pointing at it.
  const deleteRow = useCallback((rowId) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setDraftChanges((currentDrafts) => {
      if (!currentDrafts[rowId]) {
        return currentDrafts;
      }
      const next = { ...currentDrafts };
      delete next[rowId];
      return next;
    });
    setEditingCell((current) => (current?.rowId === rowId ? null : current));
  }, []);

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
  };
}

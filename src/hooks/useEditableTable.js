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

/*
 * Keeps all the table state in one place: saved rows, draft (unsaved) cells,
 * which columns are visible, and which cell is currently being edited.
 * I put it in a custom hook so DataTable.jsx stays focused on the UI.
 */
export function useEditableTable(initialRows, initialColumnIds) {
  const [rows, setRows] = useState(() => initialRows);
  const [draftChanges, setDraftChanges] = useState({});
  const [visibleColumnIds, setVisibleColumnIds] = useState(() => initialColumnIds);
  const [editingCell, setEditingCell] = useState(null);

  // If the parent passes a new data set we reset everything, otherwise we'd
  // be showing drafts that belong to the old rows.
  useEffect(() => {
    setRows(initialRows);
    setDraftChanges({});
    setEditingCell(null);
  }, [initialRows]);

  useEffect(() => {
    setVisibleColumnIds(initialColumnIds);
  }, [initialColumnIds]);

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
  };
}

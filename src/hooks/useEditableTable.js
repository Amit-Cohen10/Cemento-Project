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

/**
 * Owns all editable table state:
 * - saved rows
 * - dirty draft cells
 * - visible columns
 * - currently edited cell
 *
 * Keeping this in one hook makes the DataTable component easier to read.
 */
export function useEditableTable(initialRows, initialColumnIds) {
  const [rows, setRows] = useState(() => initialRows);
  const [draftChanges, setDraftChanges] = useState({});
  const [visibleColumnIds, setVisibleColumnIds] = useState(() => initialColumnIds);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    setRows(initialRows);
    setDraftChanges({});
    setEditingCell(null);
  }, [initialRows]);

  useEffect(() => {
    setVisibleColumnIds(initialColumnIds);
  }, [initialColumnIds]);

  const draftCellCount = useMemo(() => countDraftCells(draftChanges), [draftChanges]);
  const hasUnsavedChanges = draftCellCount > 0;

  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumnIds((currentIds) => toggleColumnId(currentIds, columnId));
  }, []);

  const startEditing = useCallback((rowId, columnId) => {
    setEditingCell({ rowId, columnId });
  }, []);

  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const updateDraftCell = useCallback(
    (rowId, columnId, value) => {
      const savedRow = rows.find((row) => row.id === rowId);
      const savedValue = savedRow ? savedRow[columnId] : undefined;

      setDraftChanges((currentDrafts) =>
        setDraftCell(currentDrafts, rowId, columnId, value, savedValue),
      );
    },
    [rows],
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

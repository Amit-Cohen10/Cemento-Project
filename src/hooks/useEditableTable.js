// this is the central state hook for the table — the "brain" of the whole thing.
// it holds everything that can change: the rows, which cells are being edited,
// which rows are selected, unsaved changes, and the undo/redo history.
// DataTable imports this hook and gets back all the state and all the action functions it needs.
//
// the data is split into four separate buckets:
//   committedRows      - the saved data (written to localStorage, survives a page refresh)
//   draftChanges       - cell edits the user made but has not saved yet
//   pendingNewRows     - rows the user added but has not saved yet
//   pendingDeletedIds  - rows the user deleted but has not saved yet
//
// the table always shows the merged result of all four buckets.
// clicking "Save changes" collapses everything into committedRows.
// clicking "Cancel" throws away all three pending buckets.
//
// it talks to:
//   rowUtils     - merge, commit, and read draft values
//   columnUtils  - toggle and reconcile column visibility
//   historyUtils - undo/redo snapshots
//   storage      - read/write to localStorage

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

// default id generator used when the caller does not pass a createRowId option.
function createDefaultRowId() {
  return `row-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

// default rows normalizer — just returns the rows unchanged.
function identityRows(rows) {
  return rows;
}

export function useEditableTable(initialRows, initialColumnIds, options = {}) {
  const {
    createRowId = createDefaultRowId,
    normalizeRows = identityRows,
  } = options;

  // load from localStorage on the first render so a page refresh keeps your edits.
  const [committedRows, setCommittedRows] = useState(() =>
    normalizeRows(loadFromStorage(STORAGE_KEY_ROWS, initialRows)),
  );

  // draftChanges is an object shaped like: { [rowId]: { [columnId]: newValue } }
  const [draftChanges, setDraftChanges] = useState({});

  // new rows the user added (shown at the top of the table).
  const [pendingNewRows, setPendingNewRows] = useState([]);

  // a Set of row ids that the user deleted but has not saved yet.
  const [pendingDeletedIds, setPendingDeletedIds] = useState(() => new Set());

  // which columns are currently visible. loaded from localStorage so hiding
  // a column survives a page refresh.
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    reconcileVisibleColumnIds(
      loadFromStorage(STORAGE_KEY_COLUMNS, initialColumnIds),
      initialColumnIds,
    ),
  );

  // editingCell is null when no cell is being edited, or { rowId, columnId } when one is.
  const [editingCell, setEditingCell] = useState(null);

  // undo/redo history (snapshots of committedRows only).
  const [history, setHistory] = useState(() => createHistory());

  // a Set of selected row ids. using a Set gives O(1) lookup when checking if a row is selected.
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

  // whenever committedRows changes, write it to localStorage.
  // we only save committed state — drafts and pending changes are intentionally temporary.
  useEffect(() => {
    saveToStorage(STORAGE_KEY_ROWS, committedRows);
  }, [committedRows]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_COLUMNS, visibleColumnIds);
  }, [visibleColumnIds]);

  // the merged list of rows that the table actually displays.
  const rows = useMemo(
    () => mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds),
    [committedRows, pendingNewRows, pendingDeletedIds],
  );

  // a Map from rowId -> row object for O(1) lookup.
  // without this, every keystroke would search the whole array to find the right row.
  const rowsById = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  // a Set of ids for rows that are pending-new. used to show a "new" visual badge.
  const pendingNewRowIds = useMemo(() => {
    const ids = new Set();
    for (const row of pendingNewRows) {
      ids.add(row.id);
    }
    return ids;
  }, [pendingNewRows]);

  // total count of individual unsaved changes (cells + new rows + deleted rows).
  const draftCellCount = useMemo(() => countDraftCells(draftChanges), [draftChanges]);
  const pendingChangesCount =
    draftCellCount + pendingNewRows.length + pendingDeletedIds.size;
  const hasUnsavedChanges = pendingChangesCount > 0;

  // toggle one column's visibility. also closes the editor if the edited column is being hidden.
  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumnIds((currentIds) => toggleColumnId(currentIds, columnId));
    setEditingCell((current) => (current?.columnId === columnId ? null : current));
  }, []);

  // replace the entire visible column list at once (used by "Show all" / "Hide all").
  const replaceVisibleColumnIds = useCallback((nextIds) => {
    setVisibleColumnIds(nextIds);
    setEditingCell((current) => {
      if (!current) return null;
      // close the editor if the column being edited is now hidden.
      return nextIds.includes(current.columnId) ? current : null;
    });
  }, []);

  // mark a cell as being edited.
  const startEditing = useCallback((rowId, columnId) => {
    setEditingCell({ rowId, columnId });
  }, []);

  // commit the current edit (keep the draft value but close the editor).
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  // update the draft value for one cell.
  // if the new value matches the saved value, the draft is removed
  // so the "unsaved" indicator does not appear when nothing actually changed.
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

  // discard the draft for one cell and close the editor.
  const cancelCellEdit = useCallback((rowId, columnId) => {
    setDraftChanges((currentDrafts) => removeDraftCell(currentDrafts, rowId, columnId));
    setEditingCell(null);
  }, []);

  // read the value for a cell — returns the draft if one exists, otherwise the saved value.
  const getCellValue = useCallback(
    (row, columnId) => getDraftCellValue(row, draftChanges, columnId),
    [draftChanges],
  );

  // returns true if this cell has an unsaved draft value.
  const isCellDirty = useCallback(
    (rowId, columnId) => hasDraftCell(draftChanges, rowId, columnId),
    [draftChanges],
  );

  // save: collapse all pending changes into committedRows and clear all pending state.
  // also pushes a snapshot to the undo history so the user can undo this save.
  const saveChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;

    setCommittedRows((current) => {
      // capture the previous committed state before we overwrite it.
      setHistory((h) => pushHistory(h, current));
      return commitPendingChanges(current, draftChanges, pendingNewRows, pendingDeletedIds);
    });
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, [draftChanges, pendingNewRows, pendingDeletedIds, hasUnsavedChanges]);

  // cancel: throw away all pending changes without touching committedRows.
  const discardChanges = useCallback(() => {
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, []);

  // add a blank new row at the top of the table.
  // the row stays in pendingNewRows until the user saves.
  const addRow = useCallback(() => {
    setPendingNewRows((current) => {
      // pass all existing rows to createRowId so the new id does not clash with anything.
      const baseline = mergePendingRows(committedRows, current, pendingDeletedIds);
      const newRow = { id: createRowId(baseline) };
      return [newRow, ...current];
    });
  }, [committedRows, createRowId, pendingDeletedIds]);

  // delete one row. two cases:
  //   1) it is a pending-new row -> just remove it from the pending list (it was never saved).
  //   2) it is a committed row -> add its id to pendingDeletedIds (it hides until saved).
  const deleteRow = useCallback((rowId) => {
    let removedFromPendingNew = false;
    setPendingNewRows((current) => {
      const next = current.filter((row) => row.id !== rowId);
      removedFromPendingNew = next.length !== current.length;
      return removedFromPendingNew ? next : current;
    });

    if (!removedFromPendingNew) {
      setPendingDeletedIds((current) => {
        if (current.has(rowId)) return current; // already marked, nothing to do
        const next = new Set(current);
        next.add(rowId);
        return next;
      });
    }

    // also clean up any draft values for this row.
    setDraftChanges((currentDrafts) => {
      if (!currentDrafts[rowId]) return currentDrafts;
      const next = { ...currentDrafts };
      delete next[rowId];
      return next;
    });
    // close the editor if this row was being edited.
    setEditingCell((current) => (current?.rowId === rowId ? null : current));
    // remove from selection.
    setSelectedRowIds((current) => {
      if (!current.has(rowId)) return current;
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }, []);

  // toggle the selected state of one row.
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

  // select or unselect a list of rows all at once.
  // used by the master checkbox in the header.
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

  // delete all currently selected rows at once.
  // we classify each id first (is it a pending-new row or a committed row?)
  // before calling any setState, because React does not run the setState
  // updater functions immediately — they are queued and run later.
  const deleteSelectedRows = useCallback(() => {
    if (selectedRowIds.size === 0) return;

    // figure out which selected ids are pending-new vs committed.
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

    // remove unsaved new rows from the pending list.
    if (idsToRemoveFromNew.length > 0) {
      const toDrop = new Set(idsToRemoveFromNew);
      setPendingNewRows((currentNew) => currentNew.filter((row) => !toDrop.has(row.id)));
    }

    // mark committed rows as deleted.
    if (idsToMarkDeleted.length > 0) {
      setPendingDeletedIds((current) => {
        const next = new Set(current);
        for (const id of idsToMarkDeleted) {
          next.add(id);
        }
        return next;
      });
    }

    // clean up draft values for all deleted rows.
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

    // close the editor if it was open on one of the deleted rows.
    setEditingCell((current) =>
      current && selectedRowIds.has(current.rowId) ? null : current,
    );

    // clear the selection.
    setSelectedRowIds(new Set());
  }, [selectedRowIds, pendingNewRows]);

  // undo: restore the previous committed snapshot.
  // all pending changes are dropped because they no longer make sense for the old data.
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

  // redo: move forward again after an undo.
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

  // return everything DataTable needs — both state values and action functions.
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
  };
}

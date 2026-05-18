// this is the central state hook for the table — the "brain" of the whole thing.
// every action the user takes on the website (typing in a cell, deleting a row,
// selecting rows, clicking Save) ends up calling a function from this hook.
//
// ── what this hook holds ────────────────────────────────────────────────────
//
// the data is split into four separate "buckets":
//
//   committedRows      - the saved data. written to localStorage after every Save.
//                        if you refresh the page, this is what loads back.
//                        example: [{ id:"1", name:"Alice", salary:80000 }, ...]
//
//   draftChanges       - cell edits the user made but has NOT saved yet.
//                        shaped as: { [rowId]: { [columnId]: newValue } }
//                        example: { "1": { name: "Alice Smith", salary: 85000 } }
//                        the orange dot in a cell means that cell has a draft.
//
//   pendingNewRows     - rows the user added with "+ Add row" but has not saved yet.
//                        they appear at the top of the table with a "new" badge.
//                        example: [{ id:"2501" }] — an empty new row waiting to be filled
//
//   pendingDeletedIds  - ids of rows the user deleted but has not saved yet.
//                        deleted rows disappear from the table immediately,
//                        but are not actually removed until Save is clicked.
//                        example: Set(["5", "12"]) — rows 5 and 12 are hidden
//
// ── concrete example of a full edit cycle ───────────────────────────────────
//
//   before any edits:
//     committedRows     = [{ id:"1", name:"Alice" }, { id:"2", name:"Bob" }]
//     draftChanges      = {}
//     pendingNewRows    = []
//     pendingDeletedIds = Set()
//
//   user types "Alice Smith" in the name cell of row 1:
//     draftChanges = { "1": { name: "Alice Smith" } }
//     table shows "Alice Smith" with an orange dot
//
//   user clicks "+ Add row":
//     pendingNewRows = [{ id:"3" }]
//     a blank row appears at the top of the table
//
//   user clicks the × button on row 2:
//     pendingDeletedIds = Set(["2"])
//     row 2 disappears from the table
//
//   user clicks "Save changes":
//     committedRows = [{ id:"3" }, { id:"1", name:"Alice Smith" }]
//     draftChanges = {}, pendingNewRows = [], pendingDeletedIds = Set()
//     localStorage is updated, orange dot disappears
//
//   user clicks Undo:
//     committedRows is restored to [{ id:"1", name:"Alice" }, { id:"2", name:"Bob" }]
//     (the state from just before that save)
//
// ── what this hook talks to ──────────────────────────────────────────────────
//   rowUtils     - merge, commit, and read draft values
//   columnUtils  - toggle and reconcile column visibility
//   historyUtils - undo/redo snapshots
//   storage      - read/write to localStorage

/** @typedef {import('../utils/types.js').Row} Row */
/** @typedef {import('../utils/types.js').DraftChanges} DraftChanges */

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

// the keys used to store data in localStorage.
// all keys are prefixed in storage.js with "cemento-table:" so they do not
// clash with other data stored on the same domain.
const STORAGE_KEY_ROWS = "data";
const STORAGE_KEY_COLUMNS = "columns";

// default id generator used when App.jsx does not pass a createRowId option.
// produces something like "row-1710000000000-4823" — unique enough for demo purposes.
function createDefaultRowId() {
  return `row-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

// default rows normalizer — just returns the rows unchanged.
// App.jsx passes normalizeRowsToUniqueNumericIds here instead.
function identityRows(rows) {
  return rows;
}

/**
 * Central state hook for the editable table.
 *
 * State is split into four buckets:
 *   - `committedRows`     – saved data, persisted to localStorage
 *   - `draftChanges`      – unsaved cell-level edits `{ [rowId]: { [columnId]: value } }`
 *   - `pendingNewRows`    – rows added but not yet saved (shown at the top)
 *   - `pendingDeletedIds` – committed row ids marked for deletion but not yet saved
 *
 * Calling `saveChanges` collapses all three pending buckets into `committedRows`.
 * Calling `discardChanges` throws the pending buckets away without touching committed state.
 *
 * @param {Row[]} initialRows - initial data loaded before localStorage hydration
 * @param {string[]} initialColumnIds - ordered list of column ids to show by default
 * @param {Object} [options]
 * @param {function(Row[]): string} [options.createRowId] - generates a unique id for a new row;
 *   receives the current merged row list so it can avoid collisions
 * @param {function(Row[]): Row[]} [options.normalizeRows] - normalizes row ids after loading
 *   from storage (e.g. to enforce unique numeric ids)
 * @returns {{
 *   rows: Row[],
 *   visibleColumnIds: string[],
 *   editingCell: { rowId: string, columnId: string } | null,
 *   draftCellCount: number,
 *   pendingNewRowCount: number,
 *   pendingDeletedCount: number,
 *   pendingChangesCount: number,
 *   hasUnsavedChanges: boolean,
 *   pendingNewRowIds: Set<string>,
 *   toggleColumnVisibility: function(string): void,
 *   replaceVisibleColumnIds: function(string[]): void,
 *   startEditing: function(string, string): void,
 *   stopEditing: function(): void,
 *   updateDraftCell: function(string, string, *): void,
 *   cancelCellEdit: function(string, string): void,
 *   getCellValue: function(Row, string): *,
 *   isCellDirty: function(string, string): boolean,
 *   saveChanges: function(): void,
 *   discardChanges: function(): void,
 *   addRow: function(): void,
 *   deleteRow: function(string): void,
 *   undo: function(): void,
 *   redo: function(): void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   selectedRowIds: Set<string>,
 *   toggleRowSelection: function(string): void,
 *   setSelectionForVisible: function(string[], boolean): void,
 *   clearSelection: function(): void,
 *   deleteSelectedRows: function(): void,
 *   bulkUpdateField: function(string, *): void,
 * }}
 */
export function useEditableTable(initialRows, initialColumnIds, options = {}) {
  const {
    createRowId = createDefaultRowId,
    normalizeRows = identityRows,
  } = options;

  // ── bucket 1: committed rows ────────────────────────────────────────────
  // the "official" saved data. on first render we try to load it from localStorage
  // (so a page refresh keeps your data). if nothing is stored yet, we fall back
  // to initialRows which comes from seed.json.
  const [committedRows, setCommittedRows] = useState(() =>
    normalizeRows(loadFromStorage(STORAGE_KEY_ROWS, initialRows)),
  );

  // ── bucket 2: draft changes ─────────────────────────────────────────────
  // shaped as { [rowId]: { [columnId]: newValue } }.
  // starts empty — grows as the user edits cells.
  // the table reads from this bucket first; if a cell has a draft, show the draft.
  // example after editing row 1's name: { "1": { name: "Alice Smith" } }
  const [draftChanges, setDraftChanges] = useState({});

  // ── bucket 3: pending new rows ──────────────────────────────────────────
  // rows added with "+ Add row" that have not been saved yet.
  // they appear at the top of the table with a "new" badge (yellow left border).
  // each one is just an empty object with an id: { id: "2501" }
  const [pendingNewRows, setPendingNewRows] = useState([]);

  // ── bucket 4: pending deleted ids ──────────────────────────────────────
  // a Set of row ids that the user deleted but has not saved yet.
  // rows in this Set are hidden from the table immediately,
  // but not actually removed from committedRows until Save is clicked.
  // this way Cancel can bring them back.
  const [pendingDeletedIds, setPendingDeletedIds] = useState(() => new Set());

  // which columns are currently shown in the table.
  // the user can toggle these with the "Columns" dropdown.
  // stored in localStorage so hiding a column survives a page refresh.
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    reconcileVisibleColumnIds(
      loadFromStorage(STORAGE_KEY_COLUMNS, initialColumnIds),
      initialColumnIds,
    ),
  );

  // tracks which cell the user is actively editing right now.
  // null when no editor is open, { rowId, columnId } when one is.
  // example: user clicks on Alice's salary cell → { rowId: "1", columnId: "salary" }
  // this makes the cell show an <input> instead of plain text.
  const [editingCell, setEditingCell] = useState(null);

  // undo/redo history — stores snapshots of committedRows (the saved state).
  // each time the user clicks "Save changes", the old committedRows is pushed here.
  // clicking Undo restores the previous snapshot.
  const [history, setHistory] = useState(() => createHistory());

  // a Set of row ids that the user has checked with the checkbox.
  // using a Set gives O(1) lookup: "is row X selected?" is an instant check
  // even with 2,500 rows.
  // example after checking 3 rows: Set(["5", "12", "99"])
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

  // ── persistence side effects ────────────────────────────────────────────

  // whenever committedRows changes (after a Save), write it to localStorage.
  // we only persist committed data — drafts are intentionally temporary
  // and would be confusing to restore after a page refresh.
  useEffect(() => {
    saveToStorage(STORAGE_KEY_ROWS, committedRows);
  }, [committedRows]);

  // whenever the user shows/hides a column, persist the column list too.
  // this way the column layout survives a page refresh.
  useEffect(() => {
    saveToStorage(STORAGE_KEY_COLUMNS, visibleColumnIds);
  }, [visibleColumnIds]);

  // ── derived state ───────────────────────────────────────────────────────

  // the merged list of rows that the table actually displays.
  // = pending new rows (at top) + committed rows (minus any hidden-deleted ones).
  // recomputed only when one of the three buckets changes.
  const rows = useMemo(
    () => mergePendingRows(committedRows, pendingNewRows, pendingDeletedIds),
    [committedRows, pendingNewRows, pendingDeletedIds],
  );

  // a Map from rowId → row object so we can find any row in O(1) time.
  // used by updateDraftCell to compare the new value against the saved value
  // (so we know whether to add or remove the orange dot).
  const rowsById = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  // a Set of ids for rows that are pending-new.
  // used by TableRow to show the yellow "new" left border on unsaved new rows.
  const pendingNewRowIds = useMemo(() => {
    const ids = new Set();
    for (const row of pendingNewRows) {
      ids.add(row.id);
    }
    return ids;
  }, [pendingNewRows]);

  // how many individual cells, new rows, and deletions are waiting to be saved.
  // shown in the toolbar as "3 unsaved" and in the tooltip as
  // "2 edited cells, 1 new row, 0 deletions".
  const draftCellCount = useMemo(() => countDraftCells(draftChanges), [draftChanges]);
  const pendingChangesCount =
    draftCellCount + pendingNewRows.length + pendingDeletedIds.size;

  // true as soon as there is anything unsaved — controls whether the Save/Cancel
  // buttons are enabled and whether the orange "N unsaved" pill appears.
  const hasUnsavedChanges = pendingChangesCount > 0;

  // ── column visibility ───────────────────────────────────────────────────

  // called when the user clicks a checkbox in the "Columns" dropdown.
  // if the user hides the column they are currently editing, close the editor.
  // example: user hides the "Salary" column while editing a salary cell → editor closes.
  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumnIds((currentIds) => toggleColumnId(currentIds, columnId));
    setEditingCell((current) => (current?.columnId === columnId ? null : current));
  }, []);

  // called by "Show all" and "Hide all" buttons in the Columns dropdown.
  // replaces the whole visible list at once instead of toggling one at a time.
  const replaceVisibleColumnIds = useCallback((nextIds) => {
    setVisibleColumnIds(nextIds);
    setEditingCell((current) => {
      if (!current) return null;
      // close the editor if its column is now hidden.
      return nextIds.includes(current.columnId) ? current : null;
    });
  }, []);

  // ── cell editing ────────────────────────────────────────────────────────

  // called when the user clicks on a cell to start editing it.
  // sets editingCell so TableRow knows to render an <input> for this cell.
  // example: user clicks the name cell of row 1 → editingCell = { rowId:"1", columnId:"name" }
  const startEditing = useCallback((rowId, columnId) => {
    setEditingCell({ rowId, columnId });
  }, []);

  // called when the user presses Tab, Enter, or clicks away from the cell.
  // closes the editor (removes the input) but KEEPS the draft value.
  // the orange dot stays until the user saves or cancels.
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  // called every time the user types a character in a cell.
  // writes the new value to draftChanges for that specific cell.
  // if the user types back the original saved value, the draft is removed
  // so the orange dot disappears (nothing actually changed).
  //
  // example:
  //   user edits row 1 name from "Alice" to "Alice Smith":
  //   draftChanges becomes { "1": { name: "Alice Smith" } }  ← orange dot appears
  //   user changes it back to "Alice":
  //   draftChanges becomes {}  ← orange dot disappears
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

  // called when the user presses Escape while editing a cell.
  // discards the draft for that cell AND closes the editor.
  // the cell goes back to showing the saved value, orange dot disappears.
  const cancelCellEdit = useCallback((rowId, columnId) => {
    setDraftChanges((currentDrafts) => removeDraftCell(currentDrafts, rowId, columnId));
    setEditingCell(null);
  }, []);

  // used by every cell to decide what value to show.
  // returns the draft value if the cell has been edited, otherwise the saved value.
  // this is why the table shows your edits in real time before you save.
  const getCellValue = useCallback(
    (row, columnId) => getDraftCellValue(row, draftChanges, columnId),
    [draftChanges],
  );

  // returns true if this cell has an unsaved edit (used to show the orange dot).
  const isCellDirty = useCallback(
    (rowId, columnId) => hasDraftCell(draftChanges, rowId, columnId),
    [draftChanges],
  );

  // ── save / cancel ───────────────────────────────────────────────────────

  // called when the user clicks "Save changes".
  // collapses all four buckets into a single committedRows array and clears the others.
  //
  // what happens step by step:
  //   1. the current committedRows is pushed to undo history (so Undo can restore it)
  //   2. commitPendingChanges merges everything:
  //      - removes pendingDeletedIds rows
  //      - prepends pendingNewRows
  //      - applies all draftChanges on top
  //   3. draftChanges, pendingNewRows, pendingDeletedIds are all cleared to empty
  //   4. the useEffect above writes the new committedRows to localStorage
  //   5. the orange "N unsaved" pill disappears, orange dots disappear
  const saveChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;

    setCommittedRows((current) => {
      // save current state to history BEFORE overwriting it, so Undo can come back here.
      setHistory((h) => pushHistory(h, current));
      return commitPendingChanges(current, draftChanges, pendingNewRows, pendingDeletedIds);
    });
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, [draftChanges, pendingNewRows, pendingDeletedIds, hasUnsavedChanges]);

  // called when the user clicks "Cancel".
  // throws away all three pending buckets without touching committedRows.
  // the table instantly goes back to the last saved state.
  // any new rows disappear, any deleted rows reappear, any edits are reversed.
  const discardChanges = useCallback(() => {
    setDraftChanges({});
    setPendingNewRows([]);
    setPendingDeletedIds(new Set());
    setEditingCell(null);
  }, []);

  // ── add / delete rows ───────────────────────────────────────────────────

  // called when the user clicks "+ Add row".
  // creates a blank row with a new unique id and puts it at the top of the table.
  // it stays in pendingNewRows (shown with yellow border) until Save is clicked.
  // if the user clicks Cancel, the new row disappears without ever being saved.
  const addRow = useCallback(() => {
    setPendingNewRows((current) => {
      // pass the full current row list to createRowId so the new id cannot clash
      // with any existing row id (including other pending new rows).
      const baseline = mergePendingRows(committedRows, current, pendingDeletedIds);
      const newRow = { id: createRowId(baseline) };
      return [newRow, ...current];
    });
  }, [committedRows, createRowId, pendingDeletedIds]);

  // called when the user clicks the × button on a specific row.
  // two different cases depending on whether the row is saved or not:
  //
  //   case 1: it is a pending-new row (never saved)
  //           → just remove it from pendingNewRows. it vanishes immediately with no trace.
  //           example: user added a blank row, didn't fill it in, clicks × → gone
  //
  //   case 2: it is a committed row (was saved to localStorage)
  //           → add its id to pendingDeletedIds. it hides from the table right away,
  //             but is only permanently removed when the user clicks "Save changes".
  //           example: user deletes row 5 → it disappears. user clicks Cancel → it comes back!
  //
  // in both cases we also clean up any draft values for that row and deselect it.
  const deleteRow = useCallback((rowId) => {
    let removedFromPendingNew = false;
    setPendingNewRows((current) => {
      const next = current.filter((row) => row.id !== rowId);
      removedFromPendingNew = next.length !== current.length;
      return removedFromPendingNew ? next : current;
    });

    if (!removedFromPendingNew) {
      // it was a committed row — mark it as deleted (but don't remove it yet).
      setPendingDeletedIds((current) => {
        if (current.has(rowId)) return current; // already marked, nothing to do
        const next = new Set(current);
        next.add(rowId);
        return next;
      });
    }

    // remove any draft edits for this row — no point keeping them if the row is gone.
    setDraftChanges((currentDrafts) => {
      if (!currentDrafts[rowId]) return currentDrafts;
      const next = { ...currentDrafts };
      delete next[rowId];
      return next;
    });
    // if the user was editing a cell in this row, close the editor.
    setEditingCell((current) => (current?.rowId === rowId ? null : current));
    // remove from the selection (no longer makes sense to have a deleted row selected).
    setSelectedRowIds((current) => {
      if (!current.has(rowId)) return current;
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }, []);

  // ── selection ───────────────────────────────────────────────────────────

  // called when the user clicks the checkbox on an individual row.
  // if the row was not selected, select it. if it was selected, deselect it.
  // the selection drives three things on the website:
  //   - the row gets a blue background
  //   - "Edit field (N)" and "Delete selected (N)" buttons appear in the toolbar
  //   - the selection summary footer shows stats for the selected rows
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

  // called by the master checkbox in the table header.
  // selects or deselects all currently visible rows at once.
  // example: user clicks "Select all (2500)" → all visible rows get blue backgrounds
  //          user clicks "Clear selection" → all rows deselected
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

  // clears the entire selection — all rows become unselected.
  // called when the user clicks the "Clear selection" button in the toolbar.
  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  // ── bulk edit ───────────────────────────────────────────────────────────

  // called when the user clicks "Apply to N rows" in the "Edit field" popover.
  // sets a draft value for the same column in every selected row at once.
  //
  // example: 50 rows selected, user sets Role = "Frontend" for all of them
  //   → draftChanges gets 50 entries: { "1": { role: "Frontend" }, "2": { role: "Frontend" }, ... }
  //   → 50 cells show the orange "unsaved" dot
  //   → user clicks Save → all 50 rows now have role "Frontend" in committedRows
  //
  // rows where the new value equals the already-saved value are skipped cleanly
  // (no false orange dot appears on rows that didn't actually change).
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
      // close the editor if it was sitting on the column we just bulk-edited.
      setEditingCell((current) =>
        current && current.columnId === columnId && selectedRowIds.has(current.rowId)
          ? null
          : current,
      );
    },
    [selectedRowIds, rowsById],
  );

  // ── delete selected rows ────────────────────────────────────────────────

  // called when the user clicks "Delete selected (N)".
  // works the same as deleteRow but for all selected rows at once.
  //
  // important: we classify each id as pending-new vs committed BEFORE calling any
  // setState, because React queues state updates — if we read pendingNewRows inside
  // a setState callback, we'd get a stale snapshot and misclassify rows.
  const deleteSelectedRows = useCallback(() => {
    if (selectedRowIds.size === 0) return;

    // first pass: decide which selected ids are pending-new and which are committed.
    const newRowIdSet = new Set(pendingNewRows.map((row) => row.id));
    const idsToRemoveFromNew = [];
    const idsToMarkDeleted = [];
    for (const id of selectedRowIds) {
      if (newRowIdSet.has(id)) {
        idsToRemoveFromNew.push(id); // never saved — can be dropped immediately
      } else {
        idsToMarkDeleted.push(id);   // was saved — hide until next Save
      }
    }

    // remove unsaved new rows from the pending list.
    if (idsToRemoveFromNew.length > 0) {
      const toDrop = new Set(idsToRemoveFromNew);
      setPendingNewRows((currentNew) => currentNew.filter((row) => !toDrop.has(row.id)));
    }

    // mark committed rows as deleted (they hide from the table until Save).
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

    // clear the selection — deleted rows should not stay selected.
    setSelectedRowIds(new Set());
  }, [selectedRowIds, pendingNewRows]);

  // ── undo / redo ─────────────────────────────────────────────────────────

  // called when the user clicks the ↶ button or presses Ctrl/Cmd+Z.
  // restores committedRows to the state it was in before the last Save.
  // all pending changes (drafts, new rows, deletions) are dropped because
  // they belong to the version of data we are undoing away from.
  //
  // example: user saved changes (name "Alice Smith"), then undoes
  //   → committedRows goes back to { name: "Alice" }
  //   → the table shows the old name again
  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyUndo(currentHistory, committedRows);
      if (!result) return currentHistory; // nothing to undo
      setCommittedRows(result.value);
      setDraftChanges({});
      setPendingNewRows([]);
      setPendingDeletedIds(new Set());
      setEditingCell(null);
      return result.history;
    });
  }, [committedRows]);

  // called when the user clicks the ↷ button or presses Ctrl/Cmd+Shift+Z.
  // re-applies a change that was previously undone.
  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const result = historyRedo(currentHistory, committedRows);
      if (!result) return currentHistory; // nothing to redo
      setCommittedRows(result.value);
      setDraftChanges({});
      setPendingNewRows([]);
      setPendingDeletedIds(new Set());
      setEditingCell(null);
      return result.history;
    });
  }, [committedRows]);

  // true when the ↶ undo button should be enabled (there is a previous state to restore).
  // true when the ↷ redo button should be enabled (there is a future state to restore).
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
    bulkUpdateField,
  };
}

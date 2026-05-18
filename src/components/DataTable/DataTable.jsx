// this is the main table component — the one that puts everything together.
// it receives the column schema and the initial rows from App.jsx,
// and it wires up all the sub-components: header, rows, filters, column picker, and the summary footer.
//
// the data flows through a pipeline before being rendered:
//   all rows -> apply filters -> sort -> virtualize (only render what is visible) -> <tr> elements
//
// it talks to:
//   useEditableTable  - manages all state (edits, deletes, selection, undo/redo)
//   useVirtualRows    - figures out which rows are in the visible scroll window
//   TableHeader       - the sticky header row with sort controls
//   TableRow          - one row of data
//   EditableCell      - one clickable/editable cell
//   ColumnPicker      - the dropdown to show/hide columns
//   FilterPanel       - the filter rows above the table
//   SelectionSummary  - the stats footer at the bottom

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditableTable } from "../../hooks/useEditableTable.js";
import { useVirtualRows } from "../../hooks/useVirtualRows.js";
import { getVisibleColumns, sortColumns } from "../../utils/columnUtils.js";
import { exportRowsAsJson } from "../../utils/exportUtils.js";
import { ANY_COLUMN, applyFilters } from "../../utils/filterUtils.js";
import { cycleSortDirection, sortRows } from "../../utils/sortUtils.js";
import { validateCell } from "../../utils/validationUtils.js";
import { BulkEditPopover } from "./BulkEditPopover.jsx";
import { ColumnPicker } from "./ColumnPicker.jsx";
import { FilterPanel } from "./FilterPanel.jsx";
import { SelectionSummary } from "./SelectionSummary.jsx";
import { TableHeader } from "./TableHeader.jsx";
import { TableRow } from "./TableRow.jsx";

// default sizes used when the caller does not provide overrides.
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_COLUMN_WIDTH = 150;
const DELETE_COLUMN_WIDTH = 56;
const SELECT_COLUMN_WIDTH = 44;

export function DataTable({
  columns,
  initialData,
  rowHeight = DEFAULT_ROW_HEIGHT,
  createRowId,
  normalizeRows,
}) {
  // scrollRef points to the scrollable <div> that wraps the table.
  // we pass it to useVirtualRows so it can listen to scroll events.
  const scrollRef = useRef(null);

  // sort the column schema by ordinalNo once. useMemo means this only
  // runs again if the columns prop changes, not on every render.
  const sortedColumns = useMemo(() => sortColumns(columns), [columns]);
  const initialColumnIds = useMemo(
    () => sortedColumns.map((column) => column.id),
    [sortedColumns],
  );

  // pull everything we need out of the central state hook.
  const {
    rows,
    visibleColumnIds,
    editingCell,
    draftCellCount,
    pendingNewRowCount,
    pendingDeletedCount,
    pendingChangesCount,
    pendingNewRowIds,
    hasUnsavedChanges,
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
  } = useEditableTable(initialData, initialColumnIds, { createRowId, normalizeRows });

  // sortState is null when no sort is active, or { columnId, direction } when one is.
  const [sortState, setSortState] = useState(null);

  // each filter is { id, columnId, operator, value }.
  // we keep a stable id on each filter so React keys stay correct when filters are removed.
  const [filters, setFilters] = useState([]);

  // add a blank filter row to the panel.
  const handleAddFilter = useCallback(() => {
    const newId = `filter-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    setFilters((current) => [
      ...current,
      { id: newId, columnId: ANY_COLUMN, operator: "contains", value: "" },
    ]);
  }, []);

  // patch one filter without replacing the whole array.
  const handleUpdateFilter = useCallback((id, patch) => {
    setFilters((current) =>
      current.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)),
    );
  }, []);

  const handleRemoveFilter = useCallback((id) => {
    setFilters((current) => current.filter((filter) => filter.id !== id));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  // "show all" makes every column visible.
  const handleShowAllColumns = useCallback(() => {
    replaceVisibleColumnIds(sortedColumns.map((column) => column.id));
  }, [replaceVisibleColumnIds, sortedColumns]);

  // "hide all" keeps only the first column so the table never has zero columns.
  const handleHideAllColumns = useCallback(() => {
    if (sortedColumns.length === 0) return;
    replaceVisibleColumnIds([sortedColumns[0].id]);
  }, [replaceVisibleColumnIds, sortedColumns]);

  // filter the schema down to only the columns the user chose to show.
  const visibleColumns = useMemo(
    () => getVisibleColumns(sortedColumns, visibleColumnIds),
    [sortedColumns, visibleColumnIds],
  );

  // if the user hides the column they were sorting by, clear the sort
  // so the sort arrow does not point at a column that is not on screen.
  useEffect(() => {
    if (sortState && !visibleColumnIds.includes(sortState.columnId)) {
      setSortState(null);
    }
  }, [sortState, visibleColumnIds]);

  // keyboard shortcut: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo.
  // we attach this to the document so it works no matter where the focus is,
  // but skip it when the user is typing in an input so we do not steal the browser's own undo.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta || event.key.toLowerCase() !== "z") return;

      const target = event.target;
      const tag = target?.tagName;
      const isTextInput =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (isTextInput) return;

      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // cleanup: remove the listener when the component is removed from the page.
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // clicking a column header cycles through: unsorted -> asc -> desc -> unsorted.
  const handleToggleSort = useCallback((columnId) => {
    setSortState((current) => cycleSortDirection(current, columnId));
  }, []);

  // step 1 of the pipeline: run the active filters against every row.
  // filters can target columns that are currently hidden, so we use sortedColumns (all of them).
  const filteredRows = useMemo(
    () => applyFilters(rows, filters, sortedColumns),
    [rows, filters, sortedColumns],
  );

  // step 2: sort the filtered rows if a sort is active.
  const sortedRows = useMemo(() => {
    if (!sortState) {
      return filteredRows;
    }
    const sortColumn = visibleColumns.find((column) => column.id === sortState.columnId);
    return sortRows(filteredRows, sortState, sortColumn);
  }, [filteredRows, sortState, visibleColumns]);

  // the minimum pixel width of the table — the sum of all visible column widths
  // plus the fixed select and delete columns. used so horizontal scroll still works
  // when many columns are visible at once.
  const tableWidth = useMemo(
    () =>
      visibleColumns.reduce(
        (totalWidth, column) => totalWidth + (column.width ?? DEFAULT_COLUMN_WIDTH),
        DELETE_COLUMN_WIDTH + SELECT_COLUMN_WIDTH,
      ),
    [visibleColumns],
  );

  // validate every visible cell. we only check the rows currently on screen
  // (after filter + sort) so editing 2,500 rows does not block on every keystroke.
  // errors are stored in a Map with the key "rowId|columnId" -> error string.
  const errorsByCell = useMemo(() => {
    const map = new Map();
    let hasAny = false;
    for (const row of sortedRows) {
      for (const column of visibleColumns) {
        const value = getCellValue(row, column.id);
        const error = validateCell(column, value);
        if (error) {
          map.set(`${row.id}|${column.id}`, error);
          hasAny = true;
        }
      }
    }
    return { map, hasAny };
  }, [sortedRows, visibleColumns, getCellValue]);

  // convenience wrapper so a cell component can ask "do I have an error?" by row + column.
  const getCellError = useCallback(
    (row, column) => errorsByCell.map.get(`${row.id}|${column.id}`) ?? null,
    [errorsByCell],
  );

  // count how many visible rows are selected to drive the header checkbox state.
  // state is "all", "some", or "none".
  const visibleSelectionInfo = useMemo(() => {
    const visibleIds = sortedRows.map((row) => row.id);
    if (visibleIds.length === 0) {
      return { state: "none", visibleSelectedCount: 0, visibleIds };
    }
    let visibleSelectedCount = 0;
    for (const id of visibleIds) {
      if (selectedRowIds.has(id)) visibleSelectedCount += 1;
    }
    let state = "none";
    if (visibleSelectedCount === visibleIds.length) {
      state = "all";
    } else if (visibleSelectedCount > 0) {
      state = "some";
    }
    return { state, visibleSelectedCount, visibleIds };
  }, [sortedRows, selectedRowIds]);

  // called when the user clicks the master checkbox in the header.
  const handleToggleSelectAll = useCallback(
    (shouldSelect) => {
      setSelectionForVisible(visibleSelectionInfo.visibleIds, shouldSelect);
    },
    [setSelectionForVisible, visibleSelectionInfo.visibleIds],
  );

  // step 3: virtualization — only render the rows that are inside the visible scroll window.
  // overscan=10 means we also render 10 rows above and below the visible area
  // so fast scrolling does not show blank space for a frame.
  const virtualRows = useVirtualRows({
    rowCount: sortedRows.length,
    rowHeight,
    scrollRef,
    overscan: 10,
  });

  // turn the virtual indexes into actual row objects.
  // the filter guards against an index that briefly falls outside the array,
  // which can happen for one frame right after a row is deleted.
  const renderedRows = useMemo(
    () =>
      virtualRows.indexes
        .map((index) => ({
          index,
          row: sortedRows[index],
        }))
        .filter((item) => item.row),
    [sortedRows, virtualRows.indexes],
  );

  // share the row height with CSS as a variable so the stylesheet and the JS always agree.
  const tableStyle = { "--row-height": `${rowHeight}px` };

  // +1 for the select column, +1 for the delete column.
  // used by the spacer rows so they span the full width of the table.
  const totalColumnsForSpacer = visibleColumns.length + 2;

  return (
    <section
      className="dataTableShell"
      style={tableStyle}
      aria-label="Reusable editable data table"
    >
      <div className="tableToolbar">
        <div className="toolbarLeft">
          <ColumnPicker
            columns={sortedColumns}
            visibleColumnIds={visibleColumnIds}
            onToggleColumn={toggleColumnVisibility}
            onShowAll={handleShowAllColumns}
            onHideAll={handleHideAllColumns}
          />
        </div>

        <div className="tableActions">
          {/* small pill showing how many rows passed the filters vs the total. */}
          <span className="statPill">
            {sortedRows.length.toLocaleString()} / {rows.length.toLocaleString()} rows
          </span>
          <span className="statPill">
            {visibleColumns.length} / {sortedColumns.length} columns
          </span>

          {/* only show the "unsaved" pill when there is something pending. */}
          {hasUnsavedChanges && (
            <span
              className="statPill hasChanges"
              title={`${draftCellCount} edited cell${draftCellCount === 1 ? "" : "s"}, ${pendingNewRowCount} new row${pendingNewRowCount === 1 ? "" : "s"}, ${pendingDeletedCount} deletion${pendingDeletedCount === 1 ? "" : "s"}`}
            >
              {pendingChangesCount} unsaved
            </span>
          )}
          {errorsByCell.hasAny && (
            <span className="statPill hasErrors" title="Save is disabled until all cells are valid">
              {errorsByCell.map.size} invalid
            </span>
          )}

          <div className="undoRedoGroup" role="group" aria-label="Undo and redo">
            <button
              type="button"
              className="iconButton"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
            >
              ↶
            </button>
            <button
              type="button"
              className="iconButton"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              aria-label="Redo"
            >
              ↷
            </button>
          </div>

          <button className="secondaryButton" type="button" onClick={addRow}>
            + Add row
          </button>

          {/* toggle between "select all" and "clear selection" depending on what is already selected. */}
          {sortedRows.length > 0 && (
            visibleSelectionInfo.state === "all" ? (
              <button
                type="button"
                className="secondaryButton"
                onClick={clearSelection}
                title="Unselect every row"
              >
                Clear selection
              </button>
            ) : (
              <button
                type="button"
                className="secondaryButton"
                onClick={() => handleToggleSelectAll(true)}
                title="Select every row in the current filtered view"
              >
                Select all ({sortedRows.length.toLocaleString()})
              </button>
            )
          )}

          {/* bulk-edit and delete buttons — only shown when at least one row is selected. */}
          {selectedRowIds.size > 0 && (
            <BulkEditPopover
              columns={sortedColumns}
              selectedCount={selectedRowIds.size}
              onApply={bulkUpdateField}
            />
          )}
          {selectedRowIds.size > 0 && (
            <button
              type="button"
              className="dangerButton"
              onClick={deleteSelectedRows}
              title={`Delete the ${selectedRowIds.size} selected rows`}
            >
              Delete selected ({selectedRowIds.size})
            </button>
          )}

          <button
            className="secondaryButton"
            type="button"
            onClick={() => exportRowsAsJson(sortedRows)}
            title={
              sortedRows.length === rows.length
                ? "Download all rows as seed.json"
                : `Download the ${sortedRows.length.toLocaleString()} filtered rows as seed.json`
            }
          >
            {sortedRows.length === rows.length
              ? "Export data"
              : `Export filtered (${sortedRows.length.toLocaleString()})`}
          </button>

          {/* cancel discards all unsaved changes. save writes them to localStorage. */}
          <button
            className="secondaryButton"
            type="button"
            disabled={!hasUnsavedChanges}
            onClick={discardChanges}
          >
            Cancel
          </button>
          <button
            className="primaryButton"
            type="button"
            disabled={!hasUnsavedChanges || errorsByCell.hasAny}
            onClick={saveChanges}
            title={
              errorsByCell.hasAny
                ? "Fix all invalid cells before saving"
                : "Save your changes locally"
            }
          >
            Save changes
          </button>
        </div>
      </div>

      <FilterPanel
        columns={sortedColumns}
        filters={filters}
        onAddFilter={handleAddFilter}
        onUpdateFilter={handleUpdateFilter}
        onRemoveFilter={handleRemoveFilter}
        onClearFilters={handleClearFilters}
      />

      <div className="tableStatus" role="status">
        {hasUnsavedChanges
          ? "Local changes are ready to save."
          : "All visible values are saved locally."}
      </div>

      <div className="tableScroll" ref={scrollRef}>
        {/* width: max(...) means the table fills 100% of the container,
            but never shrinks below its natural pixel width.
            this way horizontal scroll still appears when many columns are shown. */}
        <table className="dataTable" style={{ width: `max(${tableWidth}px, 100%)` }}>
          {/* <colgroup> tells the browser the width of each column.
              the select and delete columns have a fixed pixel width.
              data columns share the remaining space proportionally using calc(). */}
          <colgroup>
            <col style={{ width: SELECT_COLUMN_WIDTH }} />
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{
                  width: `calc((100% - ${SELECT_COLUMN_WIDTH}px - ${DELETE_COLUMN_WIDTH}px) * ${(column.width ?? DEFAULT_COLUMN_WIDTH) / (tableWidth - SELECT_COLUMN_WIDTH - DELETE_COLUMN_WIDTH)})`,
                }}
              />
            ))}
            <col style={{ width: DELETE_COLUMN_WIDTH }} />
          </colgroup>

          <TableHeader
            columns={visibleColumns}
            sortState={sortState}
            onToggleSort={handleToggleSort}
            showDeleteColumn
            selectionState={visibleSelectionInfo.state}
            onToggleSelectAll={handleToggleSelectAll}
          />

          <tbody>
            {/* the spacer rows are invisible. they take up the vertical space of all
                the rows we are NOT rendering, so the scrollbar stays the correct size. */}
            {virtualRows.paddingTop > 0 && (
              <tr className="spacerRow" style={{ height: virtualRows.paddingTop }}>
                <td className="spacerCell" colSpan={totalColumnsForSpacer} />
              </tr>
            )}

            {renderedRows.map(({ row, index }) => (
              <TableRow
                key={row.id}
                row={row}
                rowIndex={index}
                columns={visibleColumns}
                rowHeight={rowHeight}
                editingCell={editingCell}
                isSelected={selectedRowIds.has(row.id)}
                isPendingNew={pendingNewRowIds.has(row.id)}
                getCellValue={getCellValue}
                isCellDirty={isCellDirty}
                getCellError={getCellError}
                onStartEdit={startEditing}
                onStopEdit={stopEditing}
                onCancelEdit={cancelCellEdit}
                onChange={updateDraftCell}
                onDeleteRow={deleteRow}
                onToggleSelect={toggleRowSelection}
              />
            ))}

            {/* shown when all rows have been filtered out. */}
            {sortedRows.length === 0 && (
              <tr className="emptyRow">
                <td colSpan={totalColumnsForSpacer} className="emptyCell">
                  No rows match your filters.
                </td>
              </tr>
            )}

            {/* bottom spacer, same idea as the top one. */}
            {virtualRows.paddingBottom > 0 && (
              <tr className="spacerRow" style={{ height: virtualRows.paddingBottom }}>
                <td className="spacerCell" colSpan={totalColumnsForSpacer} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SelectionSummary
        rows={sortedRows}
        totalRowCount={rows.length}
        visibleColumns={visibleColumns}
        selectedRowIds={selectedRowIds}
      />
    </section>
  );
}

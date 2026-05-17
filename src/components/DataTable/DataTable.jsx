import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditableTable } from "../../hooks/useEditableTable.js";
import { useVirtualRows } from "../../hooks/useVirtualRows.js";
import { getVisibleColumns, sortColumns } from "../../utils/columnUtils.js";
import { exportRowsAsJson } from "../../utils/exportUtils.js";
import { ANY_COLUMN, applyFilters } from "../../utils/filterUtils.js";
import { cycleSortDirection, sortRows } from "../../utils/sortUtils.js";
import { validateCell } from "../../utils/validationUtils.js";
import { ColumnPicker } from "./ColumnPicker.jsx";
import { FilterPanel } from "./FilterPanel.jsx";
import { TableHeader } from "./TableHeader.jsx";
import { TableRow } from "./TableRow.jsx";

const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_COLUMN_WIDTH = 150;
const DELETE_COLUMN_WIDTH = 56;
const SELECT_COLUMN_WIDTH = 44;

/*
 * Generic table component.
 * It only knows about "columns" and "rows", not about the meaning of the data,
 * so we can drop it into any page that follows the same schema.
 *
 * Render pipeline for the body:
 *   rows -> applyFilters (panel) -> sort (header click) -> virtualize -> <tr>s
 */
export function DataTable({
  columns,
  initialData,
  rowHeight = DEFAULT_ROW_HEIGHT,
  createRowId,
  normalizeRows,
}) {
  const scrollRef = useRef(null);

  // Sort once per column-schema change. The schema is small, but doing this
  // inside useMemo means TableRow doesn't see a new array on every render.
  const sortedColumns = useMemo(() => sortColumns(columns), [columns]);
  const initialColumnIds = useMemo(
    () => sortedColumns.map((column) => column.id),
    [sortedColumns],
  );

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
  } = useEditableTable(initialData, initialColumnIds, { createRowId, normalizeRows });

  const [sortState, setSortState] = useState(null);
  // Per-column filters: each entry is { id, columnId, operator, value }.
  // I keep an id on each filter so React keys stay stable even when the
  // user reorders or deletes rows.
  const [filters, setFilters] = useState([]);

  const handleAddFilter = useCallback(() => {
    const newId = `filter-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    setFilters((current) => [
      ...current,
      { id: newId, columnId: ANY_COLUMN, operator: "contains", value: "" },
    ]);
  }, []);

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

  const visibleColumns = useMemo(
    () => getVisibleColumns(sortedColumns, visibleColumnIds),
    [sortedColumns, visibleColumnIds],
  );

  // If the user hides the column they were sorting by, clear the sort so we
  // don't have a sort indicator pointing at nothing.
  useEffect(() => {
    if (sortState && !visibleColumnIds.includes(sortState.columnId)) {
      setSortState(null);
    }
  }, [sortState, visibleColumnIds]);

  // Keyboard shortcuts: Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z to redo.
  // I attach the listener to the document so it works wherever the focus
  // is in the table -- but skip when the user is typing into an input
  // so we don't hijack the browser's text-undo.
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
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleToggleSort = useCallback((columnId) => {
    setSortState((current) => cycleSortDirection(current, columnId));
  }, []);

  // Pipeline: per-column filters -> sort -> virtualize.
  // Filters can target hidden columns, so we pass the full sortedColumns.
  const filteredRows = useMemo(
    () => applyFilters(rows, filters, sortedColumns),
    [rows, filters, sortedColumns],
  );

  const sortedRows = useMemo(() => {
    if (!sortState) {
      return filteredRows;
    }
    const sortColumn = visibleColumns.find((column) => column.id === sortState.columnId);
    return sortRows(filteredRows, sortState, sortColumn);
  }, [filteredRows, sortState, visibleColumns]);

  const tableWidth = useMemo(
    () =>
      visibleColumns.reduce(
        (totalWidth, column) => totalWidth + (column.width ?? DEFAULT_COLUMN_WIDTH),
        DELETE_COLUMN_WIDTH + SELECT_COLUMN_WIDTH,
      ),
    [visibleColumns],
  );

  // Validation: only check the rendered (filtered+sorted) rows so we don't
  // pay for 2,500 rows on every keystroke. The cell renderer asks for an
  // error string via getCellError, which reads from this map.
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

  const getCellError = useCallback(
    (row, column) => errorsByCell.map.get(`${row.id}|${column.id}`) ?? null,
    [errorsByCell],
  );

  // Selection summary across the currently visible (filtered+sorted) rows.
  // The header checkbox uses "all" / "some" / "none" to know whether to
  // show as checked, indeterminate, or empty.
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

  const handleToggleSelectAll = useCallback(
    (shouldSelect) => {
      setSelectionForVisible(visibleSelectionInfo.visibleIds, shouldSelect);
    },
    [setSelectionForVisible, visibleSelectionInfo.visibleIds],
  );

  const virtualRows = useVirtualRows({
    rowCount: sortedRows.length,
    rowHeight,
    scrollRef,
    overscan: 10,
  });

  // Map the virtual indexes to actual row objects.
  // The filter protects against indexes that briefly fall outside the data,
  // for example right after the rows array shrinks (delete row).
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

  // Expose the row height to CSS as well so the stylesheet and the JS share
  // one number. If we ever change DEFAULT_ROW_HEIGHT, both stay in sync.
  const tableStyle = { "--row-height": `${rowHeight}px` };

  // +1 for the select column on the left, +1 for the delete column on the right.
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
          />
        </div>

        <div className="tableActions">
          <span className="statPill">
            {sortedRows.length.toLocaleString()} / {rows.length.toLocaleString()} rows
          </span>
          <span className="statPill">
            {visibleColumns.length} / {sortedColumns.length} columns
          </span>
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
        <table className="dataTable" style={{ minWidth: tableWidth }}>
          <colgroup>
            <col style={{ width: SELECT_COLUMN_WIDTH }} />
            {visibleColumns.map((column) => (
              <col key={column.id} style={{ width: column.width ?? DEFAULT_COLUMN_WIDTH }} />
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
            {/* Spacer rows replace the rows we skipped, so the scrollbar
                stays the right size and the scroll position feels normal. */}
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

            {sortedRows.length === 0 && (
              <tr className="emptyRow">
                <td colSpan={totalColumnsForSpacer} className="emptyCell">
                  No rows match your filters.
                </td>
              </tr>
            )}

            {virtualRows.paddingBottom > 0 && (
              <tr className="spacerRow" style={{ height: virtualRows.paddingBottom }}>
                <td className="spacerCell" colSpan={totalColumnsForSpacer} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

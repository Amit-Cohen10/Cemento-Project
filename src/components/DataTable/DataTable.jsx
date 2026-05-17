import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditableTable } from "../../hooks/useEditableTable.js";
import { useVirtualRows } from "../../hooks/useVirtualRows.js";
import { getVisibleColumns, sortColumns } from "../../utils/columnUtils.js";
import { filterRows } from "../../utils/filterUtils.js";
import { cycleSortDirection, sortRows } from "../../utils/sortUtils.js";
import { ColumnPicker } from "./ColumnPicker.jsx";
import { TableHeader } from "./TableHeader.jsx";
import { TableRow } from "./TableRow.jsx";

const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_COLUMN_WIDTH = 150;
const DELETE_COLUMN_WIDTH = 56;

/*
 * Generic table component.
 * It only knows about "columns" and "rows", not about the meaning of the data,
 * so we can drop it into any page that follows the same schema.
 *
 * Render pipeline for the body:
 *   rows -> filter (search) -> sort (header click) -> virtualize -> <tr>s
 */
export function DataTable({ columns, initialData, rowHeight = DEFAULT_ROW_HEIGHT }) {
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
  } = useEditableTable(initialData, initialColumnIds);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState(null);

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

  const handleToggleSort = useCallback((columnId) => {
    setSortState((current) => cycleSortDirection(current, columnId));
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Apply filter first (works on the smaller saved value, fast for 2.5k rows)
  // then sort the result. Doing it in this order means the visible row count
  // shown in the toolbar matches what's on screen.
  const filteredRows = useMemo(
    () => filterRows(rows, searchQuery, visibleColumns),
    [rows, searchQuery, visibleColumns],
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
        DELETE_COLUMN_WIDTH,
      ),
    [visibleColumns],
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

  const totalColumnsForSpacer = visibleColumns.length + 1; // +1 for delete col

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

          <label className="searchField">
            <span className="searchLabel">Search</span>
            <input
              type="search"
              className="searchInput"
              placeholder="Filter rows..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </label>
        </div>

        <div className="tableActions">
          <span className="statPill">
            {sortedRows.length.toLocaleString()} / {rows.length.toLocaleString()} rows
          </span>
          <span className="statPill">
            {visibleColumns.length} / {sortedColumns.length} columns
          </span>
          <span className={`statPill ${hasUnsavedChanges ? "hasChanges" : ""}`}>
            {draftCellCount} unsaved
          </span>

          <button className="secondaryButton" type="button" onClick={addRow}>
            + Add row
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
            disabled={!hasUnsavedChanges}
            onClick={saveChanges}
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="tableStatus" role="status">
        {hasUnsavedChanges
          ? "Local changes are ready to save."
          : "All visible values are saved locally."}
      </div>

      <div className="tableScroll" ref={scrollRef}>
        <table className="dataTable" style={{ minWidth: tableWidth }}>
          <colgroup>
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
                getCellValue={getCellValue}
                isCellDirty={isCellDirty}
                onStartEdit={startEditing}
                onStopEdit={stopEditing}
                onCancelEdit={cancelCellEdit}
                onChange={updateDraftCell}
                onDeleteRow={deleteRow}
              />
            ))}

            {sortedRows.length === 0 && (
              <tr className="emptyRow">
                <td colSpan={totalColumnsForSpacer} className="emptyCell">
                  No rows match your search.
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

import { useMemo, useRef } from "react";
import { useEditableTable } from "../../hooks/useEditableTable.js";
import { useVirtualRows } from "../../hooks/useVirtualRows.js";
import { getVisibleColumns, sortColumns } from "../../utils/columnUtils.js";
import { ColumnPicker } from "./ColumnPicker.jsx";
import { TableHeader } from "./TableHeader.jsx";
import { TableRow } from "./TableRow.jsx";

const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_COLUMN_WIDTH = 150;

/*
 * Generic table component.
 * It only knows about "columns" and "rows", not about the meaning of the data,
 * so we can drop it into any page that follows the same schema.
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
  } = useEditableTable(initialData, initialColumnIds);

  const visibleColumns = useMemo(
    () => getVisibleColumns(sortedColumns, visibleColumnIds),
    [sortedColumns, visibleColumnIds],
  );

  const tableWidth = useMemo(
    () =>
      visibleColumns.reduce(
        (totalWidth, column) => totalWidth + (column.width ?? DEFAULT_COLUMN_WIDTH),
        0,
      ),
    [visibleColumns],
  );

  const virtualRows = useVirtualRows({
    rowCount: rows.length,
    rowHeight,
    scrollRef,
    overscan: 10,
  });

  // Map the virtual indexes to actual row objects.
  // The filter protects against indexes that briefly fall outside the data,
  // for example right after the rows array shrinks.
  const renderedRows = useMemo(
    () =>
      virtualRows.indexes
        .map((index) => ({
          index,
          row: rows[index],
        }))
        .filter((item) => item.row),
    [rows, virtualRows.indexes],
  );

  // Expose the row height to CSS as well so the stylesheet and the JS share
  // one number. If we ever change DEFAULT_ROW_HEIGHT, both stay in sync.
  const tableStyle = { "--row-height": `${rowHeight}px` };

  return (
    <section
      className="dataTableShell"
      style={tableStyle}
      aria-label="Reusable editable data table"
    >
      <div className="tableToolbar">
        <ColumnPicker
          columns={sortedColumns}
          visibleColumnIds={visibleColumnIds}
          onToggleColumn={toggleColumnVisibility}
        />

        <div className="tableActions">
          <span className="statPill">{rows.length.toLocaleString()} rows</span>
          <span className="statPill">
            {visibleColumns.length} / {sortedColumns.length} columns
          </span>
          <span className={`statPill ${hasUnsavedChanges ? "hasChanges" : ""}`}>
            {draftCellCount} unsaved
          </span>

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
          </colgroup>

          <TableHeader columns={visibleColumns} />

          <tbody>
            {/* Spacer rows replace the rows we skipped, so the scrollbar
                stays the right size and the scroll position feels normal. */}
            {virtualRows.paddingTop > 0 && (
              <tr className="spacerRow" style={{ height: virtualRows.paddingTop }}>
                <td className="spacerCell" colSpan={visibleColumns.length} />
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
              />
            ))}

            {virtualRows.paddingBottom > 0 && (
              <tr className="spacerRow" style={{ height: virtualRows.paddingBottom }}>
                <td className="spacerCell" colSpan={visibleColumns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

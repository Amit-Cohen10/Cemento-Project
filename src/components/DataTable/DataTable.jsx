import { useMemo, useRef } from "react";
import { useEditableTable } from "../../hooks/useEditableTable.js";
import { useVirtualRows } from "../../hooks/useVirtualRows.js";
import { getVisibleColumns, sortColumns } from "../../utils/columnUtils.js";
import { ColumnPicker } from "./ColumnPicker.jsx";
import { TableHeader } from "./TableHeader.jsx";
import { TableRow } from "./TableRow.jsx";

const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_COLUMN_WIDTH = 150;

/**
 * Generic reusable table.
 * It knows nothing about "employees"; it only needs a columns schema and rows.
 */
export function DataTable({ columns, initialData, rowHeight = DEFAULT_ROW_HEIGHT }) {
  const scrollRef = useRef(null);

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

  return (
    <section className="dataTableShell" aria-label="Reusable editable data table">
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

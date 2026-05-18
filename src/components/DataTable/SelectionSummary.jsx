// this component is the stats bar at the bottom of the table.
// it works in two modes:
//   - if rows are selected: shows stats for only the selected rows (count, sum, avg, min, max).
//   - if nothing is selected: shows stats for all visible rows (after filters).
// it only runs stats on numeric columns — string, boolean, and date columns are skipped.
// it talks to: DataTable (which passes the rows, total count, visible columns, and selected ids),
//              aggregationUtils (does the math),
//              cellValueUtils (formats the numbers for display).

import { memo, useMemo } from "react";
import { aggregateColumn } from "../../utils/aggregationUtils.js";
import { formatCellValue } from "../../utils/cellValueUtils.js";

export const SelectionSummary = memo(function SelectionSummary({
  rows,
  totalRowCount,
  visibleColumns,
  selectedRowIds,
}) {
  // are we in selection mode (at least one row is ticked)?
  const isSelectionMode = selectedRowIds.size > 0;

  // choose which rows to run the stats on.
  const targetRows = useMemo(() => {
    if (isSelectionMode) {
      // only the ticked rows.
      return rows.filter((row) => selectedRowIds.has(row.id));
    }
    // all rows currently showing (after filters and sort).
    return rows;
  }, [rows, selectedRowIds, isSelectionMode]);

  // compute stats for every visible numeric column.
  const columnStats = useMemo(() => {
    if (targetRows.length === 0) return [];
    return visibleColumns
      .filter((column) => column.type === "number")
      .map((column) => ({
        column,
        stats: aggregateColumn(targetRows, column.id),
      }))
      // drop any column where aggregateColumn returned null (no numeric values found).
      .filter((entry) => entry.stats !== null);
  }, [targetRows, visibleColumns]);

  // hide the bar entirely if there are no rows to summarise.
  if (targetRows.length === 0) {
    return null;
  }

  // isFiltered is true when some rows are hidden by a filter (but we are not in selection mode).
  const isFiltered = !isSelectionMode && rows.length !== totalRowCount;

  return (
    <div className="selectionSummary" role="status" aria-live="polite">
      <div className="selectionSummaryCount">
        <span className="selectionSummaryDot" aria-hidden="true" />
        <span>
          {isSelectionMode ? (
            // selection mode: "3 selected"
            <>
              <strong>{selectedRowIds.size.toLocaleString()}</strong> selected
            </>
          ) : isFiltered ? (
            // filter active: "45 of 2500 rows"
            <>
              <strong>{rows.length.toLocaleString()}</strong> of{" "}
              {totalRowCount.toLocaleString()} rows
            </>
          ) : (
            // no filter, no selection: "2500 rows"
            <>
              <strong>{rows.length.toLocaleString()}</strong> rows
            </>
          )}
        </span>
      </div>

      {columnStats.length === 0 ? (
        <span className="selectionSummaryEmpty">
          No numeric columns are visible.
        </span>
      ) : (
        <ul className="selectionSummaryList">
          {columnStats.map(({ column, stats }) => (
            <li key={column.id} className="selectionSummaryItem">
              <strong className="selectionSummaryTitle">{column.title}</strong>
              {/* formatCellValue is used so a currency column shows its sum as "1,200,000$". */}
              <span className="selectionSummaryStat">
                Sum: <em>{formatCellValue(column, stats.sum)}</em>
              </span>
              <span className="selectionSummaryStat">
                Avg: <em>{formatCellValue(column, Math.round(stats.avg))}</em>
              </span>
              <span className="selectionSummaryStat">
                Min: <em>{formatCellValue(column, stats.min)}</em>
              </span>
              <span className="selectionSummaryStat">
                Max: <em>{formatCellValue(column, stats.max)}</em>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

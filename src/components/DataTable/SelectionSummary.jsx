import { memo, useMemo } from "react";
import { aggregateColumn } from "../../utils/aggregationUtils.js";
import { formatCellValue } from "../../utils/cellValueUtils.js";

/*
 * Excel-style footer bar that summarises the table.
 *
 * Two modes, picked automatically:
 *   - Selection mode: at least one checkbox is ticked. The bar
 *     summarises the SELECTED rows and shows "N selected".
 *   - Overview mode (default): nothing is selected. The bar summarises
 *     EVERY row currently visible -- i.e. what's left after filters and
 *     sort. The label is "X of Y rows" when a filter is active, just
 *     "X rows" otherwise.
 *
 * Both modes show count / sum / avg / min / max for every visible numeric
 * column. Reusing formatCellValue means a currency column gets its
 * sum/avg formatted the same way the cells themselves render ("120,000$").
 *
 * The bar hides itself only when there's literally nothing to show
 * (filter returned zero rows AND nothing is selected) -- otherwise
 * keeping it visible gives the user value the moment they filter.
 */
export const SelectionSummary = memo(function SelectionSummary({
  rows,
  totalRowCount,
  visibleColumns,
  selectedRowIds,
}) {
  const isSelectionMode = selectedRowIds.size > 0;

  // Choose which rows the stats run on.
  // Selection wins because it's the more specific intent.
  const targetRows = useMemo(() => {
    if (isSelectionMode) {
      return rows.filter((row) => selectedRowIds.has(row.id));
    }
    return rows;
  }, [rows, selectedRowIds, isSelectionMode]);

  // Stats per visible NUMERIC column. Non-numeric columns are skipped.
  const columnStats = useMemo(() => {
    if (targetRows.length === 0) return [];
    return visibleColumns
      .filter((column) => column.type === "number")
      .map((column) => ({
        column,
        stats: aggregateColumn(targetRows, column.id),
      }))
      .filter((entry) => entry.stats !== null);
  }, [targetRows, visibleColumns]);

  if (targetRows.length === 0) {
    return null;
  }

  const isFiltered = !isSelectionMode && rows.length !== totalRowCount;

  return (
    <div className="selectionSummary" role="status" aria-live="polite">
      <div className="selectionSummaryCount">
        <span className="selectionSummaryDot" aria-hidden="true" />
        <span>
          {isSelectionMode ? (
            <>
              <strong>{selectedRowIds.size.toLocaleString()}</strong> selected
            </>
          ) : isFiltered ? (
            <>
              <strong>{rows.length.toLocaleString()}</strong> of{" "}
              {totalRowCount.toLocaleString()} rows
            </>
          ) : (
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

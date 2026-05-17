import { memo, useMemo } from "react";
import { aggregateColumn } from "../../utils/aggregationUtils.js";
import { formatCellValue } from "../../utils/cellValueUtils.js";

/*
 * Excel-style footer bar that summarises the selected rows.
 * Hidden when nothing is selected, so it doesn't take up space.
 *
 * For every visible NUMERIC column, I show count / sum / avg / min / max
 * computed from the selected rows. I reuse `formatCellValue` so that, say,
 * a currency column formats its sum the same way the cells themselves do.
 */
export const SelectionSummary = memo(function SelectionSummary({
  rows,
  visibleColumns,
  selectedRowIds,
}) {
  // Pre-filter to selected rows once. This is the only loop that scales
  // with rows.length; the rest of the work is per visible numeric column.
  const selectedRows = useMemo(() => {
    if (selectedRowIds.size === 0) return [];
    return rows.filter((row) => selectedRowIds.has(row.id));
  }, [rows, selectedRowIds]);

  // Compute stats per numeric column. Non-numeric columns are skipped.
  const columnStats = useMemo(() => {
    if (selectedRows.length === 0) return [];
    return visibleColumns
      .filter((column) => column.type === "number")
      .map((column) => ({
        column,
        stats: aggregateColumn(selectedRows, column.id),
      }))
      .filter((entry) => entry.stats !== null);
  }, [selectedRows, visibleColumns]);

  if (selectedRowIds.size === 0) {
    return null;
  }

  return (
    <div className="selectionSummary" role="status" aria-live="polite">
      <div className="selectionSummaryCount">
        <span className="selectionSummaryDot" aria-hidden="true" />
        <span>
          <strong>{selectedRowIds.size.toLocaleString()}</strong> selected
        </span>
      </div>

      {columnStats.length === 0 ? (
        <span className="selectionSummaryEmpty">
          Select a row in a numeric column to see sums and averages.
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

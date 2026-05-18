// this component is the stats bar at the bottom of the table.
//
// on the website: a bar is always visible at the bottom of the table that shows
// how many rows exist and statistics about numeric columns.
// it behaves differently depending on whether the user has selected rows:
//
//   no rows selected + no filter active:
//     "2,500 rows"   →   Salary: Sum 200,000,000  Avg 80,000  Min 50,000  Max 500,000
//
//   filter active, nothing selected:
//     "45 of 2,500 rows"   →   stats for the 45 visible rows only
//
//   rows selected (checkboxes ticked):
//     "15 selected"   →   stats for only those 15 rows (ignores non-selected rows)
//     this lets the user select a group and immediately see their total salary, average age, etc.
//
// only numeric columns get stats — string, boolean, and date columns are skipped entirely.
// if none of the visible columns are numeric, a small message says "No numeric columns are visible."
//
// it talks to: DataTable (which passes the rows, total count, visible columns, and selected ids),
//              aggregationUtils (does the math — count/sum/avg/min/max),
//              cellValueUtils (formats numbers correctly, e.g. "1,200,000$" for currency columns).

import { memo, useMemo } from "react";
import { aggregateColumn } from "../../utils/aggregationUtils.js";
import { formatCellValue } from "../../utils/cellValueUtils.js";

export const SelectionSummary = memo(function SelectionSummary({
  rows,           // all currently visible rows (after filtering and sorting)
  totalRowCount,  // the total number of rows before any filter — used to detect if filtering is active
  visibleColumns, // the columns currently shown in the table
  selectedRowIds, // a Set of row ids the user has ticked — empty Set when nothing is selected
}) {
  // selection mode = at least one row checkbox is ticked.
  // determines which rows are included in stats and what the row count label shows.
  const isSelectionMode = selectedRowIds.size > 0;

  // decide which rows to run the stats on.
  // selection mode  → only the rows whose checkboxes are ticked
  // normal mode     → all currently visible rows (already filtered by DataTable)
  //
  // useMemo avoids re-calculating this list on every render when nothing changed.
  const targetRows = useMemo(() => {
    if (isSelectionMode) {
      // keep only rows whose id is in the selectedRowIds Set.
      // Set.has() is O(1), so this loop is fast even with thousands of rows.
      return rows.filter((row) => selectedRowIds.has(row.id));
    }
    // normal mode: all currently visible rows.
    return rows;
  }, [rows, selectedRowIds, isSelectionMode]);

  // compute count/sum/avg/min/max for every visible numeric column.
  // we do this once and cache the result with useMemo — it only recalculates
  // when the rows or visible columns change.
  //
  // example: visible columns = [name, role, salary, experience_years]
  //   → only salary and experience_years are numeric, so columnStats will have 2 entries
  //   → each entry: { column: <column definition>, stats: { count, sum, avg, min, max } }
  const columnStats = useMemo(() => {
    if (targetRows.length === 0) return [];
    return visibleColumns
      .filter((column) => column.type === "number")  // skip non-numeric columns
      .map((column) => ({
        column,
        stats: aggregateColumn(targetRows, column.id), // null if no numeric values found
      }))
      .filter((entry) => entry.stats !== null); // drop columns with no numeric data
  }, [targetRows, visibleColumns]);

  // hide the bar entirely when there are no rows to summarise.
  // example: a filter matched zero rows → hide the bar (there's nothing to aggregate).
  if (targetRows.length === 0) {
    return null;
  }

  // isFiltered = a filter is active AND we are not in selection mode.
  // used to decide whether to show "45 rows" or "45 of 2,500 rows".
  // rows.length is the count after filtering; totalRowCount is the count before.
  // if they differ, a filter is hiding some rows.
  const isFiltered = !isSelectionMode && rows.length !== totalRowCount;

  return (
    <div className="selectionSummary" role="status" aria-live="polite">

      {/* left side: the row count label */}
      <div className="selectionSummaryCount">
        <span className="selectionSummaryDot" aria-hidden="true" />
        <span>
          {isSelectionMode ? (
            // selection mode: "15 selected"
            // the user has ticked checkboxes — show how many
            <>
              <strong>{selectedRowIds.size.toLocaleString()}</strong> selected
            </>
          ) : isFiltered ? (
            // filter is active: "45 of 2,500 rows"
            // tells the user that not all rows are showing
            <>
              <strong>{rows.length.toLocaleString()}</strong> of{" "}
              {totalRowCount.toLocaleString()} rows
            </>
          ) : (
            // no filter, no selection: "2,500 rows"
            <>
              <strong>{rows.length.toLocaleString()}</strong> rows
            </>
          )}
        </span>
      </div>

      {/* right side: stats for each visible numeric column */}
      {columnStats.length === 0 ? (
        // shown when there are numeric rows but no numeric columns visible in the table.
        // example: user hid the Salary column → this message appears instead.
        <span className="selectionSummaryEmpty">
          No numeric columns are visible.
        </span>
      ) : (
        <ul className="selectionSummaryList">
          {columnStats.map(({ column, stats }) => (
            <li key={column.id} className="selectionSummaryItem">
              {/* column title */}
              <strong className="selectionSummaryTitle">{column.title}</strong>

              {/* formatCellValue is used so the numbers look right for the column type.
                  example: a currency column shows sum as "1,200,000$" not "1200000"
                           a regular number column shows "3.14" not "3.14159..." */}
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

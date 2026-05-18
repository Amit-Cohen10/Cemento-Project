// this component renders the sticky header row of the table.
// it shows a column title in each cell, and clicking a title sorts by that column.
// the leftmost cell has a master checkbox that selects or unselects every visible row at once.
// it talks to: DataTable (which passes the columns, sort state, and selection state),
//              cellValueUtils (to get the text alignment for each column).

import { memo, useEffect, useRef } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

// memo means React will skip re-rendering this component if its props did not change.
// the header rarely changes, so this is a useful performance optimization.
export const TableHeader = memo(function TableHeader({
  columns,
  sortState,
  onToggleSort,
  showDeleteColumn,
  selectionState, // "none" | "some" | "all"
  onToggleSelectAll,
}) {
  const masterCheckboxRef = useRef(null);

  // the "indeterminate" state (a dash instead of a tick) cannot be set with JSX attributes —
  // it only exists as a JavaScript property on the DOM element.
  // so we update it directly via the ref every time selectionState changes.
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = selectionState === "some";
    }
  }, [selectionState]);

  return (
    <thead>
      <tr>
        {/* master checkbox: checked when all rows are selected, indeterminate when some are. */}
        <th className="selectHeader" scope="col">
          <input
            ref={masterCheckboxRef}
            type="checkbox"
            className="rowCheckbox"
            checked={selectionState === "all"}
            onChange={() => onToggleSelectAll(selectionState !== "all")}
            aria-label="Select all visible rows"
            title="Select all visible rows"
          />
        </th>

        {columns.map((column) => {
          const isSorted = sortState?.columnId === column.id;
          const direction = isSorted ? sortState.direction : null;

          return (
            <th
              key={column.id}
              // align-left / align-right / align-center comes from getColumnAlignment.
              // sorted / sort-asc / sort-desc adds the CSS highlight when this column is sorted.
              className={`align-${getColumnAlignment(column)} sortable ${
                isSorted ? `sorted sort-${direction}` : ""
              }`}
              style={{ width: column.width }}
              scope="col"
              onClick={() => onToggleSort(column.id)}
              role="button"
              // aria-sort tells screen readers the current sort direction.
              aria-sort={
                direction === "asc"
                  ? "ascending"
                  : direction === "desc"
                    ? "descending"
                    : "none"
              }
            >
              <span className="headerLabel">{column.title}</span>
              {/* small arrow that shows asc (▲) or desc (▼) when this column is sorted. */}
              <span className="sortIndicator" aria-hidden="true">
                {direction === "asc" ? "▲" : direction === "desc" ? "▼" : ""}
              </span>
            </th>
          );
        })}

        {/* empty header cell above the delete buttons column. */}
        {showDeleteColumn && <th className="deleteHeader" aria-hidden="true" />}
      </tr>
    </thead>
  );
});

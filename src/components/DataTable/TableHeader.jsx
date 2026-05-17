import { memo, useEffect, useRef } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

/*
 * Sticky header row. Clicking a column title cycles its sort direction.
 * The leftmost cell holds a master checkbox that selects / unselects every
 * row in the currently visible view. memo because the columns array only
 * changes when the user shows or hides a column.
 */
export const TableHeader = memo(function TableHeader({
  columns,
  sortState,
  onToggleSort,
  showDeleteColumn,
  selectionState, // "none" | "some" | "all"
  onToggleSelectAll,
}) {
  const masterCheckboxRef = useRef(null);

  // The HTML checkbox element has an "indeterminate" property that can't
  // be set declaratively in JSX, so we set it via the ref every render.
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = selectionState === "some";
    }
  }, [selectionState]);

  return (
    <thead>
      <tr>
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
              className={`align-${getColumnAlignment(column)} sortable ${
                isSorted ? `sorted sort-${direction}` : ""
              }`}
              style={{ width: column.width }}
              scope="col"
              onClick={() => onToggleSort(column.id)}
              role="button"
              aria-sort={
                direction === "asc"
                  ? "ascending"
                  : direction === "desc"
                    ? "descending"
                    : "none"
              }
            >
              <span className="headerLabel">{column.title}</span>
              {/* Small arrow shows the current sort direction. */}
              <span className="sortIndicator" aria-hidden="true">
                {direction === "asc" ? "▲" : direction === "desc" ? "▼" : ""}
              </span>
            </th>
          );
        })}

        {/* Empty header above the delete-row buttons. */}
        {showDeleteColumn && <th className="deleteHeader" aria-hidden="true" />}
      </tr>
    </thead>
  );
});

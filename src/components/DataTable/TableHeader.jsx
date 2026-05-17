import { memo } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

/*
 * Sticky header row. Clicking a header cycles its sort direction.
 * memo because the columns array only changes when the user shows or
 * hides a column.
 */
export const TableHeader = memo(function TableHeader({
  columns,
  sortState,
  onToggleSort,
  showDeleteColumn,
}) {
  return (
    <thead>
      <tr>
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

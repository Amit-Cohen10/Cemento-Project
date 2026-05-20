import { memo, useEffect, useRef } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

export const TableHeader = memo(function TableHeader({
  columns,
  sortState,
  onToggleSort,
  showDeleteColumn,
  selectionState,
  onToggleSelectAll,
}) {

  const masterCheckboxRef = useRef(null);

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

              <span className="sortIndicator" aria-hidden="true">
                {direction === "asc" ? "▲" : direction === "desc" ? "▼" : ""}
              </span>
            </th>
          );
        })}

        {showDeleteColumn && <th className="deleteHeader" aria-hidden="true" />}
      </tr>
    </thead>
  );
});

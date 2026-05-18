// this component renders the sticky header row of the table.
//
// on the website: the top row of the table has two things:
//   1. a master checkbox on the far left to select/deselect all rows at once
//   2. one header cell per column, showing the column title with a sort arrow
//
// sorting:
//   clicking any column header cycles through three states:
//     first click  → ▲  sorts ascending  (A→Z, small→big, old→new)
//     second click → ▼  sorts descending (Z→A, big→small, new→old)
//     third click  →    removes the sort (back to original order)
//   the currently sorted column shows a ▲ or ▼ arrow next to its title.
//
// master checkbox:
//   this checkbox has THREE visual states (not just two):
//     no rows selected  → empty checkbox
//     some rows selected → dash (−) — the "indeterminate" state
//     all rows selected  → ticked (✓)
//   the dash state is a special browser property that cannot be set with HTML attributes,
//   so it is set directly on the DOM element via a ref.
//
// it talks to: DataTable (which passes the columns, sort state, and selection state),
//              cellValueUtils (to get the text alignment for each column).

import { memo, useEffect, useRef } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

// memo means React will skip re-rendering this component if its props did not change.
// the header rarely changes (only when sorting or selection changes), so this
// avoids unnecessary DOM updates on every cell edit.
export const TableHeader = memo(function TableHeader({
  columns,
  sortState,         // { columnId, direction } or null if no sort is active
  onToggleSort,      // called with columnId when a header cell is clicked
  showDeleteColumn,  // true when the delete (×) column should have a header spacer
  selectionState,    // "none" | "some" | "all" — drives the master checkbox visual
  onToggleSelectAll, // called with true (select all) or false (deselect all)
}) {
  // ref to the master checkbox DOM element so we can set the indeterminate property.
  // we need a ref because indeterminate cannot be controlled via a JSX attribute —
  // it only exists as a JavaScript property on the real DOM element.
  const masterCheckboxRef = useRef(null);

  // whenever selectionState changes, update the indeterminate property on the DOM element.
  //   selectionState = "none"  → indeterminate = false, checked = false  (empty)
  //   selectionState = "some"  → indeterminate = true                    (dash −)
  //   selectionState = "all"   → indeterminate = false, checked = true   (ticked ✓)
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = selectionState === "some";
    }
  }, [selectionState]);

  return (
    <thead>
      <tr>
        {/* master checkbox cell on the far left.
            checked = true when ALL visible rows are selected.
            indeterminate is set via the ref above when SOME rows are selected.
            clicking it toggles between "select all" and "deselect all". */}
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

        {/* one header cell per visible column */}
        {columns.map((column) => {
          // is this the currently sorted column?
          const isSorted = sortState?.columnId === column.id;
          // "asc", "desc", or null if this column is not sorted.
          const direction = isSorted ? sortState.direction : null;

          return (
            <th
              key={column.id}
              // CSS classes:
              //   align-left/right/center  → text alignment matching the column type
              //   sortable                 → adds the pointer cursor and hover highlight
              //   sorted sort-asc/sort-desc → highlights the header when this column is sorted
              className={`align-${getColumnAlignment(column)} sortable ${
                isSorted ? `sorted sort-${direction}` : ""
              }`}
              style={{ width: column.width }}
              scope="col"
              onClick={() => onToggleSort(column.id)} // cycles sort direction on click
              role="button"
              // aria-sort tells screen readers the current sort direction of this column.
              aria-sort={
                direction === "asc"
                  ? "ascending"
                  : direction === "desc"
                    ? "descending"
                    : "none"
              }
            >
              {/* the column title shown to the user, e.g. "Salary", "Role", "Name" */}
              <span className="headerLabel">{column.title}</span>

              {/* small arrow shown next to the title to indicate sort direction.
                  ▲ = ascending, ▼ = descending, empty = not sorted.
                  aria-hidden so screen readers use aria-sort instead. */}
              <span className="sortIndicator" aria-hidden="true">
                {direction === "asc" ? "▲" : direction === "desc" ? "▼" : ""}
              </span>
            </th>
          );
        })}

        {/* empty header cell above the delete buttons column on the right.
            only rendered when the delete column is showing (always true in current UI).
            aria-hidden because there is no title for this column — it's just a spacer. */}
        {showDeleteColumn && <th className="deleteHeader" aria-hidden="true" />}
      </tr>
    </thead>
  );
});

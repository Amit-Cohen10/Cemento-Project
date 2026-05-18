// this component is the "Columns" dropdown button in the toolbar.
// it lets the user check or uncheck which columns are visible in the table.
// it also has "Show all" and "Hide all" shortcut buttons.
// it talks to: DataTable (which passes the column list and the current visibility state).
//
// we use the native <details>/<summary> html elements instead of building a custom popover.
// the browser handles open/close and accessibility for free, with no extra JavaScript needed.

import { memo, useMemo } from "react";

export const ColumnPicker = memo(function ColumnPicker({
  columns,
  visibleColumnIds,
  onToggleColumn,
  onShowAll,
  onHideAll,
}) {
  // a Set lets us check "is this column visible?" in O(1) time
  // instead of searching through the array every time.
  const visibleSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  const allVisible = visibleColumnIds.length === columns.length;
  // true when only one column is left — we do not allow hiding the last one.
  const onlyOneVisible = visibleColumnIds.length <= 1;

  return (
    // <details> is a native html disclosure widget.
    // clicking the <summary> inside it toggles the open/closed state automatically.
    <details className="columnPicker">
      <summary className="columnPickerToggle">
        <span className="columnPickerIcon" aria-hidden="true">
          ☰
        </span>
        <span>Columns</span>
        {/* shows "3/10" so the user can tell at a glance how many are visible. */}
        <span className="columnPickerCount">
          {visibleColumnIds.length}/{columns.length}
        </span>
        <span className="columnPickerCaret" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="columnPickerPanel" role="group" aria-label="Visible columns">
        <p className="columnPickerHint">
          Pick which columns appear in the table.
        </p>

        <div className="columnPickerActions">
          {/* disabled when every column is already showing. */}
          <button
            type="button"
            className="columnPickerActionButton"
            onClick={onShowAll}
            disabled={allVisible}
          >
            Show all
          </button>
          {/* disabled when only one column is left (we never hide the last column). */}
          <button
            type="button"
            className="columnPickerActionButton"
            onClick={onHideAll}
            disabled={onlyOneVisible}
            title="Hides every column except the first one"
          >
            Hide all
          </button>
        </div>

        <div className="columnToggleList">
          {columns.map((column) => {
            const isVisible = visibleSet.has(column.id);
            // disable the checkbox when this is the only visible column
            // so the user cannot accidentally hide everything.
            const isLastVisibleColumn = isVisible && visibleColumnIds.length === 1;

            return (
              <label className="columnToggle" key={column.id}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={isLastVisibleColumn}
                  onChange={() => onToggleColumn(column.id)}
                />
                <span>{column.title}</span>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
});

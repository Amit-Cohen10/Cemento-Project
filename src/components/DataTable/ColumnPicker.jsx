// this component is the "Columns" dropdown button in the toolbar.
//
// on the website: clicking the "Columns ☰ 7/10 ▾" button opens a panel where
// the user can check or uncheck which columns appear in the table.
// the panel shows a checkbox for every column — checked = visible, unchecked = hidden.
// two shortcut buttons at the top make it easy to show or hide everything at once.
//
// rules:
//   - the last visible column cannot be hidden (the table must always show at least one column)
//   - "Show all" is disabled when all columns are already visible (nothing to do)
//   - "Hide all" is disabled when only one column is left (can't hide it)
//
// the column count badge ("7/10") updates in real time so the user can see at a glance
// how many columns are currently shown.
//
// implementation note: we use the native HTML <details>/<summary> elements instead of
// building a custom popover with JavaScript. the browser handles open/close, focus,
// keyboard support, and accessibility for free — no extra code needed.
//
// it talks to: DataTable (which passes the column list and the current visibility state).

import { memo, useMemo } from "react";

export const ColumnPicker = memo(function ColumnPicker({
  columns,           // all column definitions (both visible and hidden)
  visibleColumnIds,  // array of ids for the columns currently shown in the table
  onToggleColumn,    // called with columnId to show/hide one column
  onShowAll,         // called to make all columns visible
  onHideAll,         // called to hide all columns except the first one
}) {
  // convert visibleColumnIds to a Set for O(1) lookup.
  // example: ["name", "role", "salary"] → Set {"name", "role", "salary"}
  // this way, checking "is this column visible?" is instant even with 50 columns.
  const visibleSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  // true when every column is already showing — "Show all" button should be disabled.
  const allVisible = visibleColumnIds.length === columns.length;

  // true when only one column is left — "Hide all" button should be disabled,
  // and that last remaining checkbox should be greyed out (can't be unchecked).
  const onlyOneVisible = visibleColumnIds.length <= 1;

  return (
    // <details> is a native HTML disclosure widget.
    // clicking the <summary> child toggles the open/closed state automatically.
    // the browser also handles: Escape to close, focus management, aria-expanded, etc.
    <details className="columnPicker">

      {/* the visible button that the user clicks to open the panel.
          shows the hamburger icon ☰, the label "Columns", a count badge, and a caret ▾ */}
      <summary className="columnPickerToggle">
        <span className="columnPickerIcon" aria-hidden="true">
          ☰
        </span>
        <span>Columns</span>
        {/* count badge: "7/10" tells the user how many columns are showing right now */}
        <span className="columnPickerCount">
          {visibleColumnIds.length}/{columns.length}
        </span>
        <span className="columnPickerCaret" aria-hidden="true">
          ▾
        </span>
      </summary>

      {/* the panel that appears below the button when it is open */}
      <div className="columnPickerPanel" role="group" aria-label="Visible columns">
        <p className="columnPickerHint">
          Pick which columns appear in the table.
        </p>

        {/* shortcut buttons: Show all / Hide all */}
        <div className="columnPickerActions">
          {/* "Show all" makes every hidden column visible.
              disabled when there is nothing to show (all columns already visible). */}
          <button
            type="button"
            className="columnPickerActionButton"
            onClick={onShowAll}
            disabled={allVisible}
          >
            Show all
          </button>

          {/* "Hide all" hides every column except the first one.
              disabled when only one column is left (can't hide the last one).
              a tooltip explains what "Hide all" actually does. */}
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

        {/* one checkbox per column.
            checked = this column is currently visible.
            unchecked = this column is currently hidden. */}
        <div className="columnToggleList">
          {columns.map((column) => {
            const isVisible = visibleSet.has(column.id);

            // the checkbox for the last visible column is disabled so the user can't
            // accidentally hide every column and end up with an empty table.
            const isLastVisibleColumn = isVisible && visibleColumnIds.length === 1;

            return (
              <label className="columnToggle" key={column.id}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={isLastVisibleColumn} // greyed out when it's the last one
                  onChange={() => onToggleColumn(column.id)}
                />
                {/* column title, e.g. "Name", "Salary", "Role" */}
                <span>{column.title}</span>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
});

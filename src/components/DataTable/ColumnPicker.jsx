import { memo, useMemo } from "react";

/*
 * Toolbar control that lets the user pick which columns are visible.
 *
 * The control is collapsed into a single dropdown button by default --
 * with 10+ columns the inline checkbox list takes too much space and
 * fights with the rest of the toolbar for attention. The user clicks the
 * button, picks columns from the popover, clicks anywhere else to close.
 *
 * I use a native <details>/<summary> instead of a custom popover. It's
 * less code, the browser handles open/close + accessibility for free,
 * and there's no need for useState or a click-outside listener -- one of
 * the rare cases where the platform gives us the right primitive.
 *
 * I disable the last checked option so the user can't accidentally hide
 * every column and end up with an empty table.
 */
export const ColumnPicker = memo(function ColumnPicker({
  columns,
  visibleColumnIds,
  onToggleColumn,
}) {
  // A Set makes the "is this id visible?" check O(1) instead of O(n).
  const visibleSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  return (
    <details className="columnPicker">
      <summary className="columnPickerToggle">
        <span className="columnPickerIcon" aria-hidden="true">
          ☰
        </span>
        <span>Columns</span>
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
        <div className="columnToggleList">
          {columns.map((column) => {
            const isVisible = visibleSet.has(column.id);
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

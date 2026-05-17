import { memo, useMemo } from "react";

/*
 * Toolbar control that lets the user pick which columns are visible.
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
    <fieldset className="columnPicker">
      <legend>Columns</legend>
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
    </fieldset>
  );
});

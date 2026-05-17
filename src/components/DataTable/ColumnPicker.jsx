import { memo, useMemo } from "react";

export const ColumnPicker = memo(function ColumnPicker({
  columns,
  visibleColumnIds,
  onToggleColumn,
}) {
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

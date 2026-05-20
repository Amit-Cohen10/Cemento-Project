import { memo, useMemo } from "react";

export const ColumnPicker = memo(function ColumnPicker({
  columns,
  visibleColumnIds,
  onToggleColumn,
  onShowAll,
  onHideAll,
}) {

  const visibleSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  const allVisible = visibleColumnIds.length === columns.length;

  const onlyOneVisible = visibleColumnIds.length <= 1;

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

        <div className="columnPickerActions">

          <button
            type="button"
            className="columnPickerActionButton"
            onClick={onShowAll}
            disabled={allVisible}
          >
            Show all
          </button>

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

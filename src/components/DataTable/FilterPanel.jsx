import { memo, useMemo } from "react";
import { normalizeOptions, toDateInputValue } from "../../utils/cellValueUtils.js";
import {
  ANY_COLUMN,
  OPERATOR_LABELS,
  operatorsForType,
} from "../../utils/filterUtils.js";

/*
 * Per-column filter panel.
 *
 * Each filter row has three controls:
 *   - Column (or "Any column" for a global match)
 *   - Operator (the dropdown changes based on the column's type)
 *   - Value (the input changes based on the column's type)
 *
 * Filters combine with AND. The user clicks "+ Add filter" to add a row
 * and the small "×" to remove one.
 */
export const FilterPanel = memo(function FilterPanel({
  columns,
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters,
}) {
  // Quick lookup so each filter row can find its column without searching.
  const columnById = useMemo(() => {
    const map = new Map();
    columns.forEach((column) => map.set(column.id, column));
    return map;
  }, [columns]);

  return (
    <section className="filterPanel" aria-label="Per-column filters">
      <div className="filterPanelHeader">
        <span className="filterPanelTitle">
          Filters{filters.length > 0 ? ` (${filters.length})` : ""}
        </span>
        <div className="filterPanelActions">
          {filters.length > 0 && (
            <button
              type="button"
              className="secondaryButton"
              onClick={onClearFilters}
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            className="secondaryButton"
            onClick={onAddFilter}
          >
            + Add filter
          </button>
        </div>
      </div>

      {filters.length === 0 ? (
        <p className="filterPanelEmpty">
          No filters yet. Click <strong>+ Add filter</strong> to narrow the table by column.
        </p>
      ) : (
        <ul className="filterList">
          {filters.map((filter) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              columns={columns}
              columnById={columnById}
              onChange={onUpdateFilter}
              onRemove={onRemoveFilter}
            />
          ))}
        </ul>
      )}
    </section>
  );
});

function FilterRow({ filter, columns, columnById, onChange, onRemove }) {
  const column = filter.columnId === ANY_COLUMN ? null : columnById.get(filter.columnId);
  // When the filter targets "Any column" we don't know the type, so we
  // treat it as string -- those are the operators the global match supports.
  const type = column?.type ?? "string";
  const operators = operatorsForType(type);

  const handleColumnChange = (event) => {
    const nextColumnId = event.target.value;
    const nextColumn = nextColumnId === ANY_COLUMN ? null : columnById.get(nextColumnId);
    const nextOperators = operatorsForType(nextColumn?.type ?? "string");
    // If the current operator isn't valid for the new column type, pick
    // the first one that is. Avoids weird states like "Equals" applied to
    // a number column with operator "Starts with".
    const nextOperator = nextOperators.includes(filter.operator)
      ? filter.operator
      : nextOperators[0];

    onChange(filter.id, {
      columnId: nextColumnId,
      operator: nextOperator,
      value: "", // reset since old value may not make sense for the new type
    });
  };

  const handleOperatorChange = (event) => {
    onChange(filter.id, { operator: event.target.value });
  };

  const handleValueChange = (nextValue) => {
    onChange(filter.id, { value: nextValue });
  };

  return (
    <li className="filterRow">
      <select
        className="filterControl"
        value={filter.columnId}
        onChange={handleColumnChange}
        aria-label="Filter column"
      >
        <option value={ANY_COLUMN}>Any column</option>
        {columns.map((col) => (
          <option key={col.id} value={col.id}>
            {col.title}
          </option>
        ))}
      </select>

      <select
        className="filterControl"
        value={filter.operator}
        onChange={handleOperatorChange}
        aria-label="Filter operator"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op] ?? op}
          </option>
        ))}
      </select>

      <ValueInput type={type} column={column} value={filter.value} onChange={handleValueChange} />

      <button
        type="button"
        className="filterRemoveButton"
        onClick={() => onRemove(filter.id)}
        aria-label="Remove this filter"
        title="Remove filter"
      >
        ×
      </button>
    </li>
  );
}

// The input changes shape based on the column's type so the user always
// gets the right keyboard / picker for the value they're typing.
function ValueInput({ type, column, value, onChange }) {
  if (type === "number") {
    return (
      <input
        type="number"
        className="filterControl filterValue"
        placeholder="Number..."
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (type === "boolean") {
    return (
      <select
        className="filterControl filterValue"
        value={String(value ?? "true")}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Filter value"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (type === "date") {
    return (
      <input
        type="date"
        className="filterControl filterValue"
        value={toDateInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  // Select columns get their actual options so the user can't pick a
  // value that doesn't exist in the data.
  if ((type === "select" || type === "selection") && column?.options) {
    const options = normalizeOptions(column.options);
    return (
      <select
        className="filterControl filterValue"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Filter value"
      >
        <option value="">Choose value...</option>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Default: free text input (string columns + "Any column").
  return (
    <input
      type="text"
      className="filterControl filterValue"
      placeholder="Value..."
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

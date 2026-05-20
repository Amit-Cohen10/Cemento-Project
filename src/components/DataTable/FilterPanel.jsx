import { memo, useMemo } from "react";
import { normalizeOptions, toDateInputValue } from "../../utils/cellValueUtils.js";
import {
  ANY_COLUMN,
  OPERATOR_LABELS,
  operatorsForType,
} from "../../utils/filterUtils.js";

export const FilterPanel = memo(function FilterPanel({
  columns,
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters,
}) {

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

  const type = column?.type ?? "string";
  const operators = operatorsForType(type);

  const handleColumnChange = (event) => {
    const nextColumnId = event.target.value;
    const nextColumn = nextColumnId === ANY_COLUMN ? null : columnById.get(nextColumnId);
    const nextOperators = operatorsForType(nextColumn?.type ?? "string");

    const nextOperator = nextOperators.includes(filter.operator)
      ? filter.operator
      : nextOperators[0];

    onChange(filter.id, {
      columnId: nextColumnId,
      operator: nextOperator,
      value: "",
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

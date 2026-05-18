// this component renders the filter section above the table.
// the user can add as many filter rows as they want.
// each filter row has three controls: which column, which operator (contains / equals / etc.), and what value.
// all active filters are combined with AND — a row must match every filter to be shown.
// it talks to: DataTable (which manages the filter list and passes it down),
//              filterUtils (for the list of operators per column type),
//              cellValueUtils (to build the value input for select and date columns).

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
  // build a Map so each FilterRow can find its column object quickly by id.
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

      {/* show a hint when no filters exist yet. */}
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

// one row inside the filter panel.
function FilterRow({ filter, columns, columnById, onChange, onRemove }) {
  // null when the user picked "Any column".
  const column = filter.columnId === ANY_COLUMN ? null : columnById.get(filter.columnId);
  // fall back to "string" for "Any column" because we do not know the type.
  const type = column?.type ?? "string";
  const operators = operatorsForType(type);

  const handleColumnChange = (event) => {
    const nextColumnId = event.target.value;
    const nextColumn = nextColumnId === ANY_COLUMN ? null : columnById.get(nextColumnId);
    const nextOperators = operatorsForType(nextColumn?.type ?? "string");

    // if the current operator does not exist for the new column type,
    // reset to the first valid operator so we do not have an impossible combination.
    const nextOperator = nextOperators.includes(filter.operator)
      ? filter.operator
      : nextOperators[0];

    onChange(filter.id, {
      columnId: nextColumnId,
      operator: nextOperator,
      value: "", // reset value because the old one may not make sense for the new column
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
      {/* column picker: which column this filter targets. */}
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

      {/* operator picker: contains / equals / greater than / etc. */}
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

      {/* value input: changes shape based on the column type. */}
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

// renders the right input widget for the filter value depending on the column type.
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
    // boolean only has two options so we use a simple yes/no dropdown.
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

  // select columns show only the valid options so the user cannot type a value that does not exist.
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

  // default: free text for string columns and "Any column".
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

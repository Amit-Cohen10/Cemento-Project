// this component renders the filter section above the table.
//
// on the website: clicking "+ Add filter" in the toolbar adds a new filter row.
// each filter row has three controls:
//   1. column picker  — which column to filter by (or "Any column" for global search)
//   2. operator       — how to compare: contains / equals / starts with / greater than / before / etc.
//   3. value input    — what to look for (changes shape depending on the column type)
//
// all active filters are combined with AND — a row must match every filter to be shown.
// example: filter 1 = Role equals "Frontend"  AND  filter 2 = Salary > 80000
//          → only Frontend engineers earning more than 80,000 appear.
//
// a filter is "active" only once the user has typed/picked a value.
// a filter row with an empty value is shown in the UI but doesn't affect the table yet,
// so the user can set up the column and operator before typing.
//
// "Any column" is a special option that searches across all columns at once.
// example: Any column contains "amit" → matches rows where ANY field contains "amit".
//
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
  // build a Map from column id → column object for fast lookup.
  // each FilterRow needs to find its column by id, and doing a .find() on an array
  // inside every render of every row would be slow with many columns.
  // a Map gives O(1) lookup: columnById.get("salary") → the salary column object.
  const columnById = useMemo(() => {
    const map = new Map();
    columns.forEach((column) => map.set(column.id, column));
    return map;
  }, [columns]);

  return (
    <section className="filterPanel" aria-label="Per-column filters">

      {/* header row: shows the title and the + Add filter / Clear all buttons */}
      <div className="filterPanelHeader">
        <span className="filterPanelTitle">
          {/* shows "Filters (3)" when filters are active so the user knows at a glance */}
          Filters{filters.length > 0 ? ` (${filters.length})` : ""}
        </span>
        <div className="filterPanelActions">
          {/* "Clear all" only appears when at least one filter exists */}
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

      {/* body: hint text when empty, or the list of filter rows */}
      {filters.length === 0 ? (
        // placeholder text shown before the user adds any filters.
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

// renders one filter row with column picker, operator picker, value input, and remove button.
// the user sees this as one horizontal bar in the filter panel.
function FilterRow({ filter, columns, columnById, onChange, onRemove }) {
  // look up the full column definition for the currently selected column.
  // null when the user has chosen "Any column" (which has no type or options).
  const column = filter.columnId === ANY_COLUMN ? null : columnById.get(filter.columnId);

  // determine the column type so we know which operators and value input to show.
  // falls back to "string" for "Any column" since we don't know the type.
  // example: "Salary" column → type = "number" → operators = ["equals", "greaterThan", "lessThan"]
  const type = column?.type ?? "string";
  const operators = operatorsForType(type);

  // called when the user changes the column picker.
  const handleColumnChange = (event) => {
    const nextColumnId = event.target.value;
    const nextColumn = nextColumnId === ANY_COLUMN ? null : columnById.get(nextColumnId);
    const nextOperators = operatorsForType(nextColumn?.type ?? "string");

    // if the previously selected operator (e.g. "greaterThan") does not exist for the new
    // column type (e.g. you switched to a string column), reset to the first valid operator.
    // example: switching from Salary (number, "greaterThan") to Name (string) →
    //          "greaterThan" is not valid for strings, so reset to "contains"
    const nextOperator = nextOperators.includes(filter.operator)
      ? filter.operator
      : nextOperators[0];

    onChange(filter.id, {
      columnId: nextColumnId,
      operator: nextOperator,
      value: "", // reset value: the old value may not make sense for the new column
    });
  };

  // called when the user changes the operator dropdown.
  // only the operator is updated; column and value stay the same.
  const handleOperatorChange = (event) => {
    onChange(filter.id, { operator: event.target.value });
  };

  // called when the value input changes.
  const handleValueChange = (nextValue) => {
    onChange(filter.id, { value: nextValue });
  };

  return (
    <li className="filterRow">
      {/* column picker: "Any column", "Name", "Role", "Salary", etc. */}
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

      {/* operator picker: the list of valid operators for this column's type.
          example: number column → "Equals / Greater than / Less than"
                   string column → "Contains / Equals / Starts with / Ends with"
                   date column   → "Equals / Before / After" */}
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

      {/* value input: the shape of this input changes based on the column type.
          see the ValueInput function below for details. */}
      <ValueInput type={type} column={column} value={filter.value} onChange={handleValueChange} />

      {/* × button to delete this filter row entirely */}
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
// the shape of the input matches the data type so it's natural to use:
//   number  → a number input (numeric keyboard, no text allowed)
//   boolean → a Yes/No dropdown (only two valid values)
//   date    → a calendar date picker
//   select  → a dropdown showing the column's predefined options
//   string  → a plain text input (default)
function ValueInput({ type, column, value, onChange }) {
  if (type === "number") {
    // number column: plain number input.
    // example: "Salary greater than [80000]" — user types a number
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
    // boolean column: only two valid values, so we use a Yes/No dropdown.
    // a free-text input would let the user type "yep" or "1" which wouldn't work.
    // example: "Active equals [Yes]" → matches rows where active = true
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
    // date column: the browser's native calendar date picker.
    // toDateInputValue converts the stored ISO string to "YYYY-MM-DD" for the input.
    // example: "Start Date before [2023-01-01]" — user picks from a calendar
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
    // select column: show only the predefined options so the user can't type an invalid value.
    // example: "Role equals [Frontend]" — dropdown shows Frontend / Backend / QA / ...
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

  // default: free text for string columns and "Any column" (global search).
  // example: "Name contains [amit]" — user types any text
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

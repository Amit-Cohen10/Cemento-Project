// utility functions for filtering the table rows.
// each filter has a columnId, an operator (contains / equals / etc.), and a value.
// multiple filters are combined with AND — a row must pass every filter to be shown.
// the special columnId "*" means "match against any column" (global search).
//
// this file is used by DataTable (to apply filters) and FilterPanel (to know which
// operators to show for each column type).

// the special value used when the user picks "Any column" in the filter panel.
export const ANY_COLUMN = "*";

// which operators are available for each column type.
// FilterPanel reads this to build the operator dropdown.
const OPERATORS_BY_TYPE = {
  string: ["contains", "equals", "startsWith", "endsWith"],
  select: ["equals", "contains"],
  selection: ["equals", "contains"],
  number: ["equals", "greaterThan", "lessThan"],
  boolean: ["equals"],
  date: ["equals", "before", "after"],
};

// human-readable labels shown in the operator dropdown.
export const OPERATOR_LABELS = {
  contains: "Contains",
  equals: "Equals",
  startsWith: "Starts with",
  endsWith: "Ends with",
  greaterThan: "Greater than",
  lessThan: "Less than",
  before: "Before",
  after: "After",
};

// returns the list of valid operators for a column type.
// falls back to string operators if the type is unknown.
export function operatorsForType(type) {
  return OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.string;
}

// run all active filters against the row array.
// returns the same array reference when there are no filters,
// so React.memo on downstream components does not re-render unnecessarily.
export function applyFilters(rows, filters, columns) {
  if (!filters || filters.length === 0) {
    return rows;
  }

  // skip filters where the user has not typed a value yet.
  const activeFilters = filters.filter(isFilterActive);
  if (activeFilters.length === 0) {
    return rows;
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));

  // a row passes only if it matches every active filter.
  return rows.filter((row) =>
    activeFilters.every((filter) => matchFilter(row, filter, columnById, columns)),
  );
}

// a filter is "active" only when the user has typed a value.
// empty filters are shown in the UI but ignored when filtering rows.
function isFilterActive(filter) {
  if (!filter) return false;
  if (!filter.columnId || !filter.operator) return false;
  const value = filter.value;
  if (value === "" || value === null || value === undefined) {
    return false;
  }
  return true;
}

// test one row against one filter.
function matchFilter(row, filter, columnById, allColumns) {
  if (filter.columnId === ANY_COLUMN) {
    // "Any column" mode: the row passes if any column matches.
    return allColumns.some((column) =>
      compareCell(row[column.id], filter.operator, filter.value, column.type),
    );
  }

  const column = columnById.get(filter.columnId);
  if (!column) {
    // the filter targets a column that no longer exists — treat as a pass
    // so we do not accidentally hide every row.
    return true;
  }
  return compareCell(row[filter.columnId], filter.operator, filter.value, column.type);
}

// compare one cell value against a query value using the given operator.
function compareCell(cellValue, operator, queryValue, type) {
  // text operators work on any type by converting the cell value to a string.
  if (operator === "contains" || operator === "startsWith" || operator === "endsWith") {
    const cellText = String(cellValue ?? "").toLowerCase();
    const queryText = String(queryValue ?? "").toLowerCase().trim();
    if (!queryText) return true; // empty query matches everything
    return textMatcherFor(operator)(cellText, queryText);
  }

  if (type === "number") {
    const cellNum = toNumber(cellValue);
    const queryNum = toNumber(queryValue);
    if (cellNum === null || queryNum === null) return false;
    if (operator === "equals") return cellNum === queryNum;
    if (operator === "greaterThan") return cellNum > queryNum;
    if (operator === "lessThan") return cellNum < queryNum;
    return false;
  }

  if (type === "boolean") {
    if (operator !== "equals") return false;
    // only accept proper yes/no values so we do not accidentally match everything.
    if (
      queryValue !== true &&
      queryValue !== false &&
      queryValue !== "true" &&
      queryValue !== "false"
    ) {
      return false;
    }
    const cellBool = Boolean(cellValue);
    const queryBool = queryValue === true || queryValue === "true";
    return cellBool === queryBool;
  }

  if (type === "date") {
    const cellTime = toDateTime(cellValue);
    const queryTime = toDateTime(queryValue);
    if (cellTime === null || queryTime === null) return false;
    if (operator === "equals") {
      // compare by day only, ignoring time-of-day.
      return toDateOnly(cellValue) === toDateOnly(queryValue);
    }
    if (operator === "before") return cellTime < queryTime;
    if (operator === "after") return cellTime > queryTime;
    return false;
  }

  // default: case-insensitive string equality.
  if (operator === "equals") {
    const cellText = String(cellValue ?? "").toLowerCase();
    const queryText = String(queryValue ?? "").toLowerCase().trim();
    return cellText === queryText;
  }

  return false;
}

// returns the right text comparison function for the given operator.
function textMatcherFor(operator) {
  if (operator === "startsWith") {
    return (cell, query) => cell.startsWith(query);
  }
  if (operator === "endsWith") {
    return (cell, query) => cell.endsWith(query);
  }
  return (cell, query) => cell.includes(query); // "contains" is the default
}

// convert a value to a number, or return null if it is not a valid finite number.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// convert a date string to a timestamp (milliseconds since 1970), or null if invalid.
function toDateTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// convert a date to "YYYY-MM-DD" string for day-level comparison.
function toDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

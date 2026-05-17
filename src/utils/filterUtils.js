/*
 * Per-column filtering for the table.
 *
 * Each filter is an object: { id, columnId, operator, value }.
 * Filters combine with AND. columnId === ANY_COLUMN ("*") means "compare
 * against every column" -- useful for global text search.
 *
 * The operators a filter can use depend on the column's type. The
 * FilterPanel reads operatorsForType() to know which options to show in
 * the dropdown, and compareCell() reads the same map (indirectly) to know
 * how to compare values.
 */

// Sentinel used by the FilterPanel "Any column" option. Reused here so the
// panel and the matcher agree on the magic value.
export const ANY_COLUMN = "*";

// Operators available for each column type. The panel reads this map to
// decide which operators to show in the dropdown.
const OPERATORS_BY_TYPE = {
  string: ["contains", "equals", "startsWith", "endsWith"],
  select: ["equals", "contains"],
  selection: ["equals", "contains"],
  number: ["equals", "greaterThan", "lessThan"],
  boolean: ["equals"],
  date: ["equals", "before", "after"],
};

// Human-readable labels for every operator id we use anywhere.
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

export function operatorsForType(type) {
  return OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.string;
}

// Apply every filter to the rows. Returns the same array instance when
// there are no active filters, so React.memo on downstream components
// doesn't see a fake change.
export function applyFilters(rows, filters, columns) {
  if (!filters || filters.length === 0) {
    return rows;
  }

  // Skip filters that have no value to compare against. They're empty
  // "add filter" rows that the user hasn't filled in yet.
  const activeFilters = filters.filter(isFilterActive);
  if (activeFilters.length === 0) {
    return rows;
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));

  return rows.filter((row) =>
    activeFilters.every((filter) => matchFilter(row, filter, columnById, columns)),
  );
}

function isFilterActive(filter) {
  if (!filter) return false;
  if (!filter.columnId || !filter.operator) return false;
  const value = filter.value;
  // An unset value means "no input yet" -> don't filter on it.
  if (value === "" || value === null || value === undefined) {
    return false;
  }
  return true;
}

function matchFilter(row, filter, columnById, allColumns) {
  if (filter.columnId === ANY_COLUMN) {
    // "Any column": check every column with the same operator.
    return allColumns.some((column) =>
      compareCell(row[column.id], filter.operator, filter.value, column.type),
    );
  }

  const column = columnById.get(filter.columnId);
  if (!column) {
    // Filter targets a column that's no longer in the schema. Treat as
    // a no-op rather than hiding every row.
    return true;
  }
  return compareCell(row[filter.columnId], filter.operator, filter.value, column.type);
}

// One cell vs one query value. Operator-first so text operators
// (contains/startsWith/endsWith) can work on every type by stringifying
// the cell, while equality and comparison operators stay type-aware.
function compareCell(cellValue, operator, queryValue, type) {
  // Text operators on any type.
  if (operator === "contains" || operator === "startsWith" || operator === "endsWith") {
    const cellText = String(cellValue ?? "").toLowerCase();
    const queryText = String(queryValue ?? "").toLowerCase().trim();
    if (!queryText) return true;
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
    // Reject queryValues that aren't a real yes/no -- otherwise something
    // like "amit" would be coerced to false and falsely match every No
    // cell.
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
      // Day-level equality so picking 2024-03-15 in the date input matches
      // any row that occurred on 2024-03-15 regardless of the time-of-day
      // we stored.
      return toDateOnly(cellValue) === toDateOnly(queryValue);
    }
    if (operator === "before") return cellTime < queryTime;
    if (operator === "after") return cellTime > queryTime;
    return false;
  }

  // Default: string / select equality (case insensitive).
  if (operator === "equals") {
    const cellText = String(cellValue ?? "").toLowerCase();
    const queryText = String(queryValue ?? "").toLowerCase().trim();
    return cellText === queryText;
  }

  return false;
}

function textMatcherFor(operator) {
  if (operator === "startsWith") {
    return (cell, query) => cell.startsWith(query);
  }
  if (operator === "endsWith") {
    return (cell, query) => cell.endsWith(query);
  }
  // "contains" is the safe default.
  return (cell, query) => cell.includes(query);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDateTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function toDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

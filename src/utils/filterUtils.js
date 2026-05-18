// utility functions for filtering the table rows.
//
// on the website: when the user clicks "+ Add filter", picks a column, an operator,
// and types a value, this file does the actual work of deciding which rows to show.
// multiple filters are combined with AND — a row must pass every filter to be visible.
//
// example: if the user adds two filters —
//   1. role = "Frontend"
//   2. salary > 80000
// then only rows where role is "Frontend" AND salary is above 80000 will show.
//
// the special columnId "*" means "any column" — useful for a quick global text search
// where you want to find "amit" regardless of which column it appears in.
//
// this file is used by DataTable (to apply filters) and FilterPanel (to know which
// operators to show for each column type).

/** @typedef {import('./types.js').Row} Row */
/** @typedef {import('./types.js').ColumnDef} ColumnDef */

/**
 * A single filter rule applied to the table.
 *
 * @typedef {Object} Filter
 * @property {string} id - stable key used as React list key
 * @property {string} columnId - target column id, or ANY_COLUMN ("*") for global match
 * @property {string} operator - e.g. "contains", "equals", "greaterThan"
 * @property {*} value - the value to compare against
 */

/** @type {string} sentinel that means "match against every column" */
// the special value used when the user picks "Any column" in the filter panel.
// example: operator "contains", value "amit" will match any row where ANY field contains "amit".
export const ANY_COLUMN = "*";

// which operators are available for each column type.
// FilterPanel reads this to build the operator dropdown for the chosen column.
//
// examples of what each operator does on the website:
//   string  → "contains"    row name "Amit Cohen" contains "amit"        → match
//             "equals"      row name "Amit" equals "amit"                → match (case-insensitive)
//             "startsWith"  row name "Amit Cohen" starts with "amit"     → match
//             "endsWith"    row name "Amit Cohen" ends with "cohen"      → match
//   number  → "greaterThan" row salary 90000 > 80000                     → match
//             "lessThan"    row salary 50000 < 80000                     → match
//   boolean → "equals"      row active=true equals "yes" (true)          → match
//   date    → "before"      row joinedAt 2022-01-01 before 2023-01-01   → match
//             "after"       row joinedAt 2024-06-01 after  2023-01-01   → match
const OPERATORS_BY_TYPE = {
  string: ["contains", "equals", "startsWith", "endsWith"],
  select: ["equals", "contains"],
  selection: ["equals", "contains"],
  number: ["equals", "greaterThan", "lessThan"],
  boolean: ["equals"],
  date: ["equals", "before", "after"],
};

/** @type {Object.<string, string>} human-readable labels for every operator id */
// these are the labels the user sees in the operator dropdown in the filter panel.
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

/**
 * Return the list of valid operator ids for a given column type.
 * Falls back to string operators for unknown types.
 *
 * @param {string} type - column type from {@link ColumnDef}
 * @returns {string[]}
 */
// returns the list of operators to show in the dropdown for a given column type.
// example: type "number" → ["equals", "greaterThan", "lessThan"]
//          type "date"   → ["equals", "before", "after"]
export function operatorsForType(type) {
  return OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.string;
}

/**
 * Apply every active filter to the rows, combining them with AND.
 * Returns the same array reference when there are no active filters.
 *
 * @param {Row[]} rows
 * @param {Filter[]} filters
 * @param {ColumnDef[]} columns - full schema (filters may target hidden columns)
 * @returns {Row[]}
 */
// run all active filters against the row array and return only the rows that pass all of them.
//
// "active" means the user has typed a value — filters with an empty value field are ignored.
// this lets the user set up a filter row without it affecting the table until they type.
//
// example:
//   filters = [{ columnId: "role", operator: "equals", value: "Frontend" },
//              { columnId: "salary", operator: "greaterThan", value: "80000" }]
//   → only rows where role is exactly "Frontend" AND salary is more than 80000 will survive.
//
// returns the same array reference when no filters are active so React.memo downstream
// does not re-render unnecessarily.
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
// this lets the filter panel show a blank row while the user is still deciding what to type.
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
// if the filter targets any column ("*"), the row passes if any column matches.
// otherwise we look up the specific column and compare its value.
function matchFilter(row, filter, columnById, allColumns) {
  if (filter.columnId === ANY_COLUMN) {
    // "Any column" mode: the row passes if any column matches.
    // example: search "amit" → row passes if name="Amit Cohen" OR team="Amit's team" etc.
    return allColumns.some((column) =>
      compareCell(row[column.id], filter.operator, filter.value, column.type),
    );
  }

  const column = columnById.get(filter.columnId);
  if (!column) {
    // the filter targets a column that no longer exists (e.g. it was hidden or renamed).
    // treat as a pass so we do not accidentally hide every row.
    return true;
  }
  return compareCell(row[filter.columnId], filter.operator, filter.value, column.type);
}

// compare one cell value against a query value using the given operator.
//
// text operators (contains / startsWith / endsWith) work on any column type
// by converting the cell value to a lowercase string first, so a number cell
// like 120000 can still be searched as "120000".
//
// number operators compare numerically so "90000 > 80000" works correctly
// (string comparison would say "9" > "8" but "90000" > "200000" incorrectly).
//
// date operators compare timestamps so "before 2023" checks the actual calendar date.
function compareCell(cellValue, operator, queryValue, type) {
  // text operators work on any type by converting the cell value to a string.
  // example: contains, value "amit" → cell "Amit Cohen".toLowerCase() includes "amit" → true
  if (operator === "contains" || operator === "startsWith" || operator === "endsWith") {
    const cellText = String(cellValue ?? "").toLowerCase();
    const queryText = String(queryValue ?? "").toLowerCase().trim();
    if (!queryText) return true; // empty query matches everything
    return textMatcherFor(operator)(cellText, queryText);
  }

  if (type === "number") {
    // compare as actual numbers so 90000 > 80000 works correctly.
    // example: greaterThan, value "80000" → cell 90000 > 80000 → true
    const cellNum = toNumber(cellValue);
    const queryNum = toNumber(queryValue);
    if (cellNum === null || queryNum === null) return false;
    if (operator === "equals") return cellNum === queryNum;
    if (operator === "greaterThan") return cellNum > queryNum;
    if (operator === "lessThan") return cellNum < queryNum;
    return false;
  }

  if (type === "boolean") {
    // on the website, the filter dropdown shows "Yes" (true) or "No" (false).
    // example: equals, value true → cell active=true → match
    //          equals, value false → cell active=true → no match
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
    // compare by timestamp so calendar ordering is correct.
    // example: before, value "2023-01-01" → cell "2022-06-15" is before 2023 → match
    //          after,  value "2023-01-01" → cell "2024-03-20" is after  2023 → match
    //          equals                     → compares day only, ignoring time
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
  // example: equals, value "frontend" → cell "Frontend" → match
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
// null means "this cell cannot be compared numerically" and the filter will not match.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// convert a date string to a timestamp (milliseconds since 1970), or null if invalid.
// null means the date could not be parsed and the filter will not match.
function toDateTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// convert a date to "YYYY-MM-DD" string for day-level comparison.
// this strips the time portion so "2024-03-15T09:00:00Z" equals "2024-03-15T23:00:00Z".
function toDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

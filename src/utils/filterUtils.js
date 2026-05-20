export const ANY_COLUMN = "*";

const OPERATORS_BY_TYPE = {
  string: ["contains", "equals", "startsWith", "endsWith"],
  select: ["equals", "contains"],
  selection: ["equals", "contains"],
  number: ["equals", "greaterThan", "lessThan"],
  boolean: ["equals"],
  date: ["equals", "before", "after"],
};

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

export function applyFilters(rows, filters, columns) {
  if (!filters || filters.length === 0) {
    return rows;
  }

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
  if (value === "" || value === null || value === undefined) {
    return false;
  }
  return true;
}

function matchFilter(row, filter, columnById, allColumns) {
  if (filter.columnId === ANY_COLUMN) {

    return allColumns.some((column) =>
      compareCell(row[column.id], filter.operator, filter.value, column.type),
    );
  }

  const column = columnById.get(filter.columnId);
  if (!column) {

    return true;
  }
  return compareCell(row[filter.columnId], filter.operator, filter.value, column.type);
}

function compareCell(cellValue, operator, queryValue, type) {

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

      return toDateOnly(cellValue) === toDateOnly(queryValue);
    }
    if (operator === "before") return cellTime < queryTime;
    if (operator === "after") return cellTime > queryTime;
    return false;
  }

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

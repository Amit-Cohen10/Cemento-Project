/*
 * Pure helpers for the click-to-sort feature.
 *
 * I keep these out of the React tree so they're easy to unit-test and the
 * DataTable component stays focused on rendering.
 */

// Click cycle: unsorted -> asc -> desc -> unsorted.
// Clicking a different column always starts at asc, which feels natural.
export function cycleSortDirection(current, columnId) {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}

// Return a new sorted array. Sort is stable in modern JS engines, so rows
// that have equal sort keys keep their relative order.
export function sortRows(rows, sortState, column) {
  if (!sortState || !column) {
    return rows;
  }

  const { columnId, direction } = sortState;
  const sign = direction === "asc" ? 1 : -1;
  const compare = compareByType(column.type);

  return [...rows].sort((left, right) =>
    sign * compare(left[columnId], right[columnId]),
  );
}

// Each column type wants a slightly different comparator. Splitting it out
// keeps the main sort function easy to read.
function compareByType(type) {
  if (type === "number") {
    // Treat empty cells as -Infinity so they sink to the bottom when desc.
    return (a, b) => (toNumber(a)) - (toNumber(b));
  }

  if (type === "boolean") {
    return (a, b) => Number(Boolean(a)) - Number(Boolean(b));
  }

  if (type === "date") {
    // ISO date strings sort lexicographically the same as chronologically,
    // so we can compare them as strings.
    return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
  }

  // string and select both compare as text.
  return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return -Infinity;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : -Infinity;
}

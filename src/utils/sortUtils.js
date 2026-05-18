// utility functions for sorting table rows when the user clicks a column header.
// these are plain functions with no React — easy to test and reason about.
// used by DataTable.

// handles the three-state sort cycle:
//   first click on a column  -> sort ascending (a -> z, small -> big)
//   second click             -> sort descending (z -> a, big -> small)
//   third click              -> remove the sort (back to original order)
//   clicking a different column always starts at ascending.
export function cycleSortDirection(current, columnId) {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  // third click: return null to clear the sort.
  return null;
}

// returns a new sorted copy of the rows array.
// we spread into a new array ([...rows]) before sorting because Array.sort mutates
// the original array, which would confuse React's change detection.
export function sortRows(rows, sortState, column) {
  if (!sortState || !column) {
    return rows;
  }

  const { columnId, direction } = sortState;
  // sign flips the comparison result: 1 = ascending, -1 = descending.
  const sign = direction === "asc" ? 1 : -1;
  const sortType = column.sortType ?? column.type;
  const compare = compareByType(sortType);

  return [...rows].sort((left, right) => {
    const leftValue = left[columnId];
    const rightValue = right[columnId];
    const leftIsEmpty = isEmptySortValue(leftValue, sortType);
    const rightIsEmpty = isEmptySortValue(rightValue, sortType);

    // empty values always sort to the bottom regardless of direction.
    if (leftIsEmpty && rightIsEmpty) return 0;
    if (leftIsEmpty) return 1;
    if (rightIsEmpty) return -1;

    return sign * compare(leftValue, rightValue);
  });
}

// returns the right comparator function for each column type.
function compareByType(type) {
  if (type === "number") {
    return (a, b) => Number(a) - Number(b);
  }

  if (type === "boolean") {
    // convert to 0 or 1 so we can subtract. false (0) < true (1).
    return (a, b) => Number(Boolean(a)) - Number(Boolean(b));
  }

  if (type === "date") {
    // ISO date strings ("2024-03-15T...") sort correctly as strings
    // because the format is year-month-day from left to right.
    return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
  }

  // string and select columns both compare as text.
  return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
}

// returns true if the value should be treated as "empty" for sorting purposes.
// empty values are always pushed to the bottom.
function isEmptySortValue(value, type) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  if (type === "number") {
    return !Number.isFinite(Number(value));
  }

  if (type === "date") {
    return Number.isNaN(new Date(value).getTime());
  }

  return false;
}

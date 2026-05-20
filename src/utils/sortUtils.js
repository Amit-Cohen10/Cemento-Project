export function cycleSortDirection(current, columnId) {

  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}

export function sortRows(rows, sortState, column) {

  if (!sortState || !column) {
    return rows;
  }

  const { columnId, direction } = sortState;

  const sign = direction === "asc" ? 1 : -1;

  const sortType = column.sortType ?? column.type;
  const compare = compareByType(sortType);

  return [...rows].sort((left, right) => {
    const leftValue = left[columnId];
    const rightValue = right[columnId];

    const leftIsEmpty = isEmptySortValue(leftValue, sortType);
    const rightIsEmpty = isEmptySortValue(rightValue, sortType);

    if (leftIsEmpty && rightIsEmpty) return 0;
    if (leftIsEmpty) return 1;
    if (rightIsEmpty) return -1;

    return sign * compare(leftValue, rightValue);
  });
}

function compareByType(type) {
  if (type === "number") {

    return (a, b) => Number(a) - Number(b);
  }

  if (type === "boolean") {

    return (a, b) => Number(Boolean(a)) - Number(Boolean(b));
  }

  if (type === "date") {

    return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
  }

  return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
}

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

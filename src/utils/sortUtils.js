// utility functions for sorting table rows when the user clicks a column header.
//
// on the website: clicking a column header cycles through three states:
//   click 1 → ▲  ascending  (A→Z for text, smallest→biggest for numbers, oldest→newest for dates)
//   click 2 → ▼  descending (Z→A, biggest→smallest, newest→oldest)
//   click 3 → no arrow — sort removed, rows go back to their original order
//
// clicking a DIFFERENT column header always starts at ascending, regardless of what was active before.
//
// special rule: rows with no value in the sorted column always float to the BOTTOM,
// even when the sort is ascending. so a salary column sorted ascending shows
// [70,000 / 80,000 / 90,000 / "Not set" / "Not set"] — the blank ones never push to the top.
//
// these are plain functions with no React — easy to test and reason about.
// used by DataTable.

// handles the three-state sort cycle:
//   first click on a column  → sort ascending  (a → z, small → big)
//   second click             → sort descending (z → a, big → small)
//   third click              → remove the sort (back to original order)
//   clicking a different column always starts at ascending.
//
// example:
//   current = null, columnId = "name"
//     → { columnId: "name", direction: "asc" }   (first click, ascending)
//   current = { columnId: "name", direction: "asc" }, columnId = "name"
//     → { columnId: "name", direction: "desc" }  (second click, descending)
//   current = { columnId: "name", direction: "desc" }, columnId = "name"
//     → null                                      (third click, sort removed)
//   current = { columnId: "name", direction: "asc" }, columnId = "salary"
//     → { columnId: "salary", direction: "asc" } (different column, always starts ascending)
export function cycleSortDirection(current, columnId) {
  // no active sort, or the user clicked a different column — start fresh with ascending.
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  // currently ascending → switch to descending.
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  // currently descending → remove the sort entirely (third click).
  return null;
}

// returns a new sorted copy of the rows array.
// we spread into a new array ([...rows]) before sorting because Array.sort mutates
// the original array in place, which would confuse React's change detection and
// potentially corrupt the original data order.
//
// example:
//   sortState = { columnId: "salary", direction: "asc" }
//   rows = [{ salary: 90000 }, { salary: null }, { salary: 70000 }]
//   result → [{ salary: 70000 }, { salary: 90000 }, { salary: null }]
//              (sorted small→big, null pushed to bottom)
//
// if sortState is null (no active sort) the original array is returned unchanged.
export function sortRows(rows, sortState, column) {
  // no active sort or no column definition — return rows in their original order.
  if (!sortState || !column) {
    return rows;
  }

  const { columnId, direction } = sortState;

  // sign = 1 for ascending (a before b), -1 for descending (b before a).
  // we multiply the comparator result by sign to flip the order.
  // example: compareResult = 1 means "a > b"
  //   ascending  (sign=1):  1 * 1 = 1  → a comes after b  (correct: a > b means b first)
  //   descending (sign=-1): -1 * 1 = -1 → a comes before b (reversed: a > b means a first)
  const sign = direction === "asc" ? 1 : -1;

  // use sortType if defined (some columns may want number-style sorting even for text columns),
  // otherwise fall back to the column's declared type.
  const sortType = column.sortType ?? column.type;
  const compare = compareByType(sortType);

  return [...rows].sort((left, right) => {
    const leftValue = left[columnId];
    const rightValue = right[columnId];

    // check if either value is "empty" (null, undefined, empty string, NaN, invalid date).
    const leftIsEmpty = isEmptySortValue(leftValue, sortType);
    const rightIsEmpty = isEmptySortValue(rightValue, sortType);

    // empty values always sink to the bottom regardless of sort direction.
    // example: salary sort ascending: [70k, 90k, null] — null stays last even in ascending.
    if (leftIsEmpty && rightIsEmpty) return 0;  // both empty — keep their relative order
    if (leftIsEmpty) return 1;                   // left is empty — push it down
    if (rightIsEmpty) return -1;                 // right is empty — push it down

    // both values are real — compare them and apply the direction sign.
    return sign * compare(leftValue, rightValue);
  });
}

// returns the right comparator function for each column type.
// each comparator takes two values (a, b) and returns:
//   negative number → a comes before b
//   positive number → a comes after b
//   zero            → same position
function compareByType(type) {
  if (type === "number") {
    // subtract to compare numerically.
    // example: a=70000, b=90000 → 70000 - 90000 = -20000 (negative) → a comes first (ascending)
    return (a, b) => Number(a) - Number(b);
  }

  if (type === "boolean") {
    // convert true/false to 1/0 so we can subtract.
    // false (0) sorts before true (1) in ascending order.
    // example ascending: [false, false, true] — inactive employees first
    return (a, b) => Number(Boolean(a)) - Number(Boolean(b));
  }

  if (type === "date") {
    // ISO date strings ("2024-03-15T00:00:00.000Z") compare correctly as plain strings
    // because the format is always year-month-day from left to right.
    // example: "2022-01-01" < "2024-06-15" — string comparison gives the right calendar order.
    return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
  }

  // string and select columns both compare as text using locale-aware comparison.
  // localeCompare handles accents and different alphabets correctly.
  // example: "alice" < "Bob" < "charlie" (case-insensitive ordering)
  return (a, b) => String(a ?? "").localeCompare(String(b ?? ""));
}

// returns true if the value should be treated as "empty" for sorting purposes.
// empty values are always pushed to the bottom of the table regardless of sort direction.
//
// what counts as empty:
//   null, undefined, ""      → always empty (no value was set)
//   NaN or Infinity          → empty for number columns (not a valid number)
//   unparseable date string  → empty for date columns (not a valid date)
function isEmptySortValue(value, type) {
  // universally empty: no value at all.
  if (value === null || value === undefined || value === "") {
    return true;
  }

  // for number columns, a value that isn't a finite number (e.g. Infinity, NaN) is empty.
  if (type === "number") {
    return !Number.isFinite(Number(value));
  }

  // for date columns, a string that can't be parsed into a real date is empty.
  if (type === "date") {
    return Number.isNaN(new Date(value).getTime());
  }

  // everything else (strings, booleans, select values) is never empty at this point
  // because we already caught null/"" above.
  return false;
}

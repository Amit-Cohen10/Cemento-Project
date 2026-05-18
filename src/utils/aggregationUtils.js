// calculates summary statistics for a numeric column across a set of rows.
//
// on the website: when the user selects rows by clicking checkboxes, a stats bar appears
// at the bottom of the table (the "SelectionSummary" footer). for every numeric column
// that is visible, it shows something like:
//
//   Salary  →  count: 5   sum: 450,000   avg: 90,000   min: 70,000   max: 120,000
//
// this file does the math behind those numbers.
//
// it only looks at numeric columns — string or boolean columns are skipped silently.
// if none of the selected rows have a real number in the column, it returns null
// (which tells the footer to skip that column entirely).
//
// this is a pure function (no React, no side effects) so it is easy to test.
// used by SelectionSummary to power the stats bar at the bottom of the table.

/** @typedef {import('./types.js').Row} Row */

/**
 * Compute count, sum, avg, min, and max for one numeric column across the given rows.
 * Returns `null` when the column contains no finite numeric values.
 *
 * @param {Row[]} rows
 * @param {string} columnId
 * @returns {{ count: number, sum: number, avg: number, min: number, max: number } | null}
 */
export function aggregateColumn(rows, columnId) {
  // go through every row and pick out the value for this column.
  // only keep it if it is a real finite number — skip nulls, empty strings, NaN, etc.
  //
  // example: columnId = "salary", rows have salaries [90000, null, 70000, "N/A", 120000]
  //   → numericValues will be [90000, 70000, 120000]   (null, "N/A" are skipped)
  const numericValues = [];
  for (const row of rows) {
    const value = row[columnId];
    if (typeof value === "number" && Number.isFinite(value)) {
      numericValues.push(value);
    }
  }

  // if no row had a numeric value in this column, return null.
  // the footer uses null to decide "don't show stats for this column".
  // example: if all selected rows have salary = null → return null → footer skips salary.
  if (numericValues.length === 0) {
    return null;
  }

  // compute sum, min, and max in one pass through the array.
  // doing it in one loop instead of three separate reduce() calls is faster
  // because we only scan the array once, not three times.
  //
  // example with [90000, 70000, 120000]:
  //   after loop: sum = 280000, min = 70000, max = 120000
  let sum = 0;
  let min = numericValues[0]; // start with the first value as the current min/max
  let max = numericValues[0];
  for (const value of numericValues) {
    sum += value;
    if (value < min) min = value; // found a smaller value, update min
    if (value > max) max = value; // found a larger value, update max
  }

  // return all five stats at once.
  // avg is sum divided by how many values we found (not the total row count,
  // because some rows may have had null/missing salary).
  //
  // example result:
  //   { count: 3, sum: 280000, avg: 93333.33, min: 70000, max: 120000 }
  return {
    count: numericValues.length,
    sum,
    avg: sum / numericValues.length,
    min,
    max,
  };
}

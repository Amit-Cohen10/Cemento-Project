// calculates summary statistics for a numeric column across a set of rows.
// returns count, sum, average, min, and max.
// returns null if the column has no numeric values at all.
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
  // collect only valid finite numbers — skip nulls, strings, NaN, etc.
  const numericValues = [];
  for (const row of rows) {
    const value = row[columnId];
    if (typeof value === "number" && Number.isFinite(value)) {
      numericValues.push(value);
    }
  }

  // nothing to aggregate.
  if (numericValues.length === 0) {
    return null;
  }

  // compute sum, min, and max in a single pass through the array
  // instead of calling reduce three separate times.
  let sum = 0;
  let min = numericValues[0];
  let max = numericValues[0];
  for (const value of numericValues) {
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return {
    count: numericValues.length,
    sum,
    avg: sum / numericValues.length,
    min,
    max,
  };
}

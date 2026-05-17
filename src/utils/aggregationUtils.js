/*
 * Aggregations over a set of selected rows -- the "Excel status bar" data.
 *
 * Each numeric column gives us count / sum / avg / min / max. I keep it
 * to those five because that's what users actually want and read; more
 * stats would crowd the footer.
 *
 * The function is pure so it can be unit-tested without React and reused
 * if I ever surface the same stats elsewhere (toolbar, export, etc.).
 */

export function aggregateColumn(rows, columnId) {
  const numericValues = [];
  for (const row of rows) {
    const value = row[columnId];
    if (typeof value === "number" && Number.isFinite(value)) {
      numericValues.push(value);
    }
  }

  if (numericValues.length === 0) {
    return null;
  }

  // One pass for sum/min/max so we don't walk the array three times.
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

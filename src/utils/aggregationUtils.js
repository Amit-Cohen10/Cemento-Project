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

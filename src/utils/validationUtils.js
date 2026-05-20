export function validateCell(column, value) {
  if (!column) return null;

  if (column.required) {
    const isMissing =
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && Number.isNaN(value));
    if (isMissing) return "Required";
  }

  if (column.type === "number" && value !== null && value !== undefined && value !== "") {
    const num = Number(value);
    if (!Number.isFinite(num)) return "Must be a number";
    if (typeof column.min === "number" && num < column.min) {
      return `Must be ≥ ${column.min}`;
    }
    if (typeof column.max === "number" && num > column.max) {
      return `Must be ≤ ${column.max}`;
    }
  }

  return null;
}

export function collectInvalidCells(rows, columns, draftChanges) {
  const errors = [];

  for (const row of rows) {
    const rowDrafts = draftChanges[row.id] ?? null;
    for (const column of columns) {
      const draftHasCell =
        rowDrafts && Object.prototype.hasOwnProperty.call(rowDrafts, column.id);

      const value = draftHasCell ? rowDrafts[column.id] : row[column.id];
      const error = validateCell(column, value);
      if (error) {
        errors.push({ rowId: row.id, columnId: column.id, error });
      }
    }
  }

  return errors;
}

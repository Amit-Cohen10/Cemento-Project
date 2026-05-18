// validates cell values against rules defined in the column schema.
// a column can have any of these rules:
//   required: true  - the cell cannot be empty
//   min: number     - the value must be >= min (number columns only)
//   max: number     - the value must be <= max (number columns only)
//
// validateCell returns null when the value is valid,
// or a short error string (like "Required") that the cell shows as a tooltip.
//
// used by DataTable (to build the errorsByCell map)
// and collectInvalidCells (to find all errors before saving).

/** @typedef {import('./types.js').ColumnDef} ColumnDef */
/** @typedef {import('./types.js').Row} Row */
/** @typedef {import('./types.js').DraftChanges} DraftChanges */

/**
 * Validate one cell value against its column's schema rules.
 * Returns an error string on failure, or `null` when the value is valid.
 *
 * @param {ColumnDef} column
 * @param {*} value
 * @returns {string | null}
 */
export function validateCell(column, value) {
  if (!column) return null;

  // check required: the value must not be empty.
  if (column.required) {
    const isMissing =
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && Number.isNaN(value));
    if (isMissing) return "Required";
  }

  // check min and max for number columns.
  // we skip this if the value is empty because the required rule already handles that.
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

  return null; // no error
}

/**
 * Walk all rows and columns and collect every invalid cell, checking draft values first.
 *
 * @param {Row[]} rows
 * @param {ColumnDef[]} columns
 * @param {DraftChanges} draftChanges
 * @returns {{ rowId: string, columnId: string, error: string }[]}
 */
// walk all rows and columns and collect every invalid cell.
// checks draft values first because those are the values that would be saved.
// returns an array of { rowId, columnId, error } objects.
export function collectInvalidCells(rows, columns, draftChanges) {
  const errors = [];

  for (const row of rows) {
    const rowDrafts = draftChanges[row.id] ?? null;
    for (const column of columns) {
      const draftHasCell =
        rowDrafts && Object.prototype.hasOwnProperty.call(rowDrafts, column.id);
      // use the draft value if one exists, otherwise use the saved value.
      const value = draftHasCell ? rowDrafts[column.id] : row[column.id];
      const error = validateCell(column, value);
      if (error) {
        errors.push({ rowId: row.id, columnId: column.id, error });
      }
    }
  }

  return errors;
}

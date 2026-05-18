// utility functions for managing which columns are visible and in what order.
// used by DataTable and useEditableTable.

/** @typedef {import('./types.js').ColumnDef} ColumnDef */

/**
 * Return a copy of the columns array sorted by `ordinalNo` ascending.
 *
 * @param {ColumnDef[]} columns
 * @returns {ColumnDef[]}
 */
// sort columns by their ordinalNo field so they always appear in the defined order.
// we copy the array first ([...columns]) so we do not mutate the original schema.
export function sortColumns(columns) {
  return [...columns].sort((left, right) => left.ordinalNo - right.ordinalNo);
}

/**
 * Return only the columns whose ids appear in `visibleColumnIds`, in schema order.
 *
 * @param {ColumnDef[]} columns
 * @param {string[]} visibleColumnIds
 * @returns {ColumnDef[]}
 */
// return only the columns the user has chosen to show, in schema order.
// we use schema order (not the order of visibleColumnIds) so columns do not
// jump around when the user toggles them on and off.
export function getVisibleColumns(columns, visibleColumnIds) {
  const visibleSet = new Set(visibleColumnIds);
  return sortColumns(columns).filter((column) => visibleSet.has(column.id));
}

/**
 * Merge stored visibility ids with the current schema: remove stale ids and append new ones.
 * Falls back to showing all columns when `storedIds` is empty or invalid.
 *
 * @param {string[]} storedIds - ids loaded from localStorage
 * @param {string[]} allColumnIds - the current full schema id list
 * @returns {string[]}
 */
// merge the column visibility stored in localStorage with the current column schema.
// this handles two cases that can happen when the schema changes:
//   - a column that no longer exists in the schema is removed from the stored list
//   - a new column added to the schema appears as visible (not hidden forever)
export function reconcileVisibleColumnIds(storedIds, allColumnIds) {
  if (!Array.isArray(storedIds) || storedIds.length === 0) {
    // nothing stored yet — show all columns.
    return allColumnIds;
  }

  const allIdsSet = new Set(allColumnIds);
  // keep only stored ids that still exist in the schema.
  const nextIds = storedIds.filter((id) => allIdsSet.has(id));

  // add any new schema ids that were not in storage (so new columns appear by default).
  for (const id of allColumnIds) {
    if (!nextIds.includes(id)) {
      nextIds.push(id);
    }
  }

  return nextIds.length > 0 ? nextIds : allColumnIds;
}

/**
 * Toggle `columnId` in the visible list. Refuses to remove the last visible column.
 *
 * @param {string[]} visibleColumnIds
 * @param {string} columnId
 * @returns {string[]}
 */
// add or remove one column id from the visible list.
// enforces a minimum of one visible column so the table never ends up empty.
export function toggleColumnId(visibleColumnIds, columnId) {
  if (visibleColumnIds.includes(columnId)) {
    // trying to hide this column — only allow it if at least one other column is visible.
    if (visibleColumnIds.length === 1) {
      return visibleColumnIds; // do nothing, can't hide the last column
    }
    return visibleColumnIds.filter((id) => id !== columnId);
  }

  // column is currently hidden — add it back.
  return [...visibleColumnIds, columnId];
}

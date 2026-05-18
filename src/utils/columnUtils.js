// utility functions for managing which columns are visible and in what order.
//
// on the website: the user can open the "Columns" dropdown in the toolbar and
// check/uncheck columns to show or hide them. the table then re-renders to show
// only the selected columns, in the order defined by their ordinalNo field.
//
// the visible column list is saved in localStorage so it persists between page reloads.
// but the schema (the full column definition list) can change over time (e.g. a developer
// adds a new column). the reconcileVisibleColumnIds function handles this mismatch.
//
// rule enforced: at least one column must always be visible.
// this prevents the table from becoming completely empty, which would be confusing.
//
// used by DataTable and useEditableTable.

/** @typedef {import('./types.js').ColumnDef} ColumnDef */

/**
 * Return a copy of the columns array sorted by `ordinalNo` ascending.
 *
 * @param {ColumnDef[]} columns
 * @returns {ColumnDef[]}
 */
// sort columns by their ordinalNo field so they always appear in the right visual order.
// we copy the array first ([...columns]) so we never modify the original schema array.
//
// example: columns defined with ordinalNo [3, 1, 2] → returned in order [1, 2, 3]
// on the website this ensures that if you toggle "Salary" off and back on,
// it always reappears in its original position, not at the end.
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
//
// we use schema order (ordinalNo) not the order of visibleColumnIds, so that
// columns always stay in the same position on screen. if the user unchecks "Salary"
// and then re-checks it, it comes back in the same column position, not at the end.
//
// example:
//   columns schema:         [id(1), name(2), role(3), salary(4), team(5)]
//   visibleColumnIds:       ["name", "salary", "team"]
//   result (schema order):  [name(2), salary(4), team(5)]
//
// internally converts visibleColumnIds into a Set for O(1) lookup so that tables
// with many columns don't become slow.
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
// merge the column visibility list saved in localStorage with the current column schema.
//
// this handles two problems that happen when the schema changes after the user already
// has a saved visibility preference:
//
//   problem 1: the user hid the "Salary" column, then a developer REMOVED "Salary" from
//              the schema. the stored list still contains "salary" — we must remove it.
//   problem 2: a developer ADDED a new "Department" column to the schema. the stored list
//              doesn't mention "department" at all — we must add it so it appears by default.
//
// example:
//   storedIds:    ["name", "salary", "team"]  (salary is the stale one, department is missing)
//   allColumnIds: ["name", "role", "team", "department"]  (new schema without salary, with department)
//   result:       ["name", "team", "department"]
//                 (salary removed, department appended, name+team kept)
//
// if storedIds is empty (first visit, or localStorage was cleared), show every column.
export function reconcileVisibleColumnIds(storedIds, allColumnIds) {
  // nothing was stored yet — first visit or cleared storage — show all columns.
  if (!Array.isArray(storedIds) || storedIds.length === 0) {
    return allColumnIds;
  }

  const allIdsSet = new Set(allColumnIds);

  // keep only stored ids that still exist in the current schema.
  // this removes ids for columns that were deleted from the schema.
  const nextIds = storedIds.filter((id) => allIdsSet.has(id));

  // add any schema ids that weren't in storage.
  // these are new columns added after the user last changed their settings.
  // they appear visible by default.
  for (const id of allColumnIds) {
    if (!nextIds.includes(id)) {
      nextIds.push(id);
    }
  }

  // safety fallback: if somehow nextIds ended up empty (e.g. all stored ids were stale),
  // fall back to showing everything.
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
//
// on the website this is called when the user clicks a checkbox in the "Columns" dropdown.
// if the column is currently visible, it is removed (hidden).
// if the column is currently hidden, it is added back (shown).
//
// special rule: if only ONE column is visible, the user cannot hide it.
// the table would become completely empty with no columns, which doesn't make sense.
// in that case the function returns the list unchanged and does nothing.
//
// example:
//   visibleColumnIds: ["name", "role", "salary"]  user clicks "role" to hide it
//   result:           ["name", "salary"]
//
//   visibleColumnIds: ["name"]  user tries to hide "name"
//   result:           ["name"]  (no change — can't hide the last column)
export function toggleColumnId(visibleColumnIds, columnId) {
  if (visibleColumnIds.includes(columnId)) {
    // the column is currently visible — the user wants to hide it.
    // refuse if this is the last visible column.
    if (visibleColumnIds.length === 1) {
      return visibleColumnIds; // do nothing — can't hide the last column
    }
    // remove this id from the visible list.
    return visibleColumnIds.filter((id) => id !== columnId);
  }

  // the column is currently hidden — the user wants to show it again.
  // append its id to the end of the visible list.
  // (getVisibleColumns will then sort by ordinalNo, so the visual position is correct.)
  return [...visibleColumnIds, columnId];
}

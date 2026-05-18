// shared JSDoc type definitions used across utils and hooks.
// this file contains no runtime code — only @typedef blocks that give
// editors autocompletion and inline type information.

/**
 * A column definition from the table schema.
 *
 * @typedef {Object} ColumnDef
 * @property {string} id - key used to look up the value on each row
 * @property {number} ordinalNo - display order (0 = leftmost)
 * @property {string} title - header label shown to the user
 * @property {("string"|"number"|"boolean"|"select"|"selection"|"date")} type
 * @property {number} [width] - default column width in pixels
 * @property {boolean} [required] - cell may not be left empty
 * @property {boolean} [readOnly] - user cannot edit this cell
 * @property {number} [min] - minimum allowed value (number columns)
 * @property {number} [max] - maximum allowed value (number columns)
 * @property {Array<string|{label: string, value: *}>} [options] - choices for select columns
 * @property {"currency"} [format] - display hint, e.g. format numbers as "120,000$"
 * @property {"number"} [sortType] - override sort behaviour (e.g. sort a string column numerically)
 */

/**
 * A data row. The `id` field is always a string; every other field is
 * dynamic and keyed by its column's `id`.
 *
 * @typedef {Object} Row
 * @property {string} id
 */

/**
 * Pending cell edits, keyed first by rowId then by columnId.
 * Only cells whose value differs from the saved value have an entry here.
 *
 * @typedef {Object.<string, Object.<string, *>>} DraftChanges
 */

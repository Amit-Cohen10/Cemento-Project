// utility functions for reading, writing, and displaying cell values.
//
// on the website, every cell goes through two directions:
//   → display:  stored value → human-readable text shown in the cell
//               example: 120000 (number) → "120,000$" in a salary cell
//               example: "2024-03-15T..." (ISO string) → "Mar 15, 2024" in a date cell
//               example: true (boolean) → green "Yes" pill
//
//   ← input:    raw string from <input> → correct JS type to store
//               example: user types "95000" in a number cell → stored as 95000 (number)
//               example: user picks a date → stored as "2024-03-15T00:00:00.000Z" (ISO string)
//               example: user checks a checkbox → stored as true (boolean)
//
// keeping these conversions in one place means EditableCell, FilterPanel, and
// SelectionSummary all format values the same way.
//
// used by EditableCell (to display and parse values),
//         FilterPanel (for the date input),
//         SelectionSummary (to format stats),
//         TableHeader (to decide text alignment).

/** @typedef {import('./types.js').ColumnDef} ColumnDef */

// we create these formatters once at module level instead of inside a function
// because creating an Intl formatter is expensive and we call format() many times per render.

// formats a plain number with commas: 120000 → "120,000"
const currencyAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

// formats a number with up to 2 decimal places: 3.14159 → "3.14"
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

// formats a date object to a readable string: 2024-03-15 → "Mar 15, 2024"
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

/**
 * Normalise select column options into a uniform `{ label, value }` shape.
 * Accepts plain strings or `{ label, value }` objects.
 *
 * @param {Array<string | { label: string, value: * }>} [options]
 * @returns {{ label: string, value: * }[]}
 */
// select column options can be defined in two ways in mockTableData.js:
//   simple strings:  ["Frontend", "Backend", "QA"]
//   objects:         [{ label: "Frontend Engineer", value: "frontend" }]
//
// this function converts both formats to the object shape so the rest of the
// code only needs to handle one format.
//
// example:
//   "Frontend" (string) → { label: "Frontend", value: "Frontend" }
//   { label: "Senior Dev", value: "senior" } → { label: "Senior Dev", value: "senior" }
export function normalizeOptions(options = []) {
  return options.map((option) => {
    if (option && typeof option === "object") {
      return {
        label: String(option.label ?? option.value),
        value: option.value,
      };
    }
    // plain string — use it as both the label and the value.
    return {
      label: String(option),
      value: option,
    };
  });
}

/**
 * Convert a raw input value (always a string from the DOM) into the correct
 * JavaScript type for the column (number, boolean, ISO date string, etc.).
 *
 * @param {ColumnDef} column
 * @param {string | boolean | number | null | undefined} rawValue
 * @returns {*}
 */
// convert what the user typed (or the DOM gave us) into the correct stored type.
//
// why this is needed: HTML inputs always give back strings. if the user types "95000"
// in a salary field, the DOM gives us the string "95000". without this function we
// would store the string, and then "95000" > "100000" would be true (wrong!)
// because string comparison is alphabetical, not numeric.
//
// examples by column type:
//   number:  "95000"         → 95000 (number)
//            ""              → null  (empty = not set)
//            "abc"           → null  (not a number)
//   boolean: "true"          → true
//            "false"         → false
//            true (already)  → true  (passed through as-is)
//   select:  "Frontend"      → "Frontend" (matched against options list)
//   date:    "2024-03-15"    → "2024-03-15T00:00:00.000Z" (full ISO string for consistent sorting)
//   string:  "Amit Cohen"    → "Amit Cohen" (no conversion needed)
export function parseCellValue(column, rawValue) {
  if (column.type === "number") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }
    const numberValue = Number(rawValue);
    // Number("abc") → NaN, Number("95000") → 95000
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  if (column.type === "boolean") {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }
    // a checkbox gives us true/false directly, but a string input might give "true" or "on".
    // "on" is what a native HTML checkbox sends when checked.
    return rawValue === "true" || rawValue === "on" || rawValue === 1;
  }

  if (column.type === "select" || column.type === "selection") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }
    // find the matching option so we store the original typed value, not just its string version.
    // example: options include { label: "Frontend Engineer", value: "frontend" }
    //          rawValue "frontend" → stored as "frontend" (the value, not the label)
    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );
    return matchingOption ? matchingOption.value : rawValue;
  }

  if (column.type === "date") {
    // <input type="date"> gives us "YYYY-MM-DD" (e.g. "2024-03-15").
    // we convert it to a full ISO string so that sorting and date comparisons
    // work consistently across timezones.
    // example: "2024-03-15" → "2024-03-15T00:00:00.000Z"
    if (!rawValue) {
      return null;
    }
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  // default: keep it as a string (name, team, location columns, etc.).
  return String(rawValue ?? "");
}

/**
 * Format a stored cell value as the human-readable string shown in the cell.
 * Returns `"Not set"` for null / undefined / empty string.
 *
 * @param {ColumnDef} column
 * @param {*} value
 * @returns {string}
 */
// convert what is stored in the data into the human-readable text shown in the cell.
//
// examples by column type:
//   boolean:  true           → "Yes"         (shown as a green pill)
//             false          → "No"          (shown as a dark pill)
//   number:   120000         → "120,000$"    (salary column with format "currency")
//             3.14159        → "3.14"        (regular number column)
//   select:   "frontend"     → "Frontend"    (label from the options list)
//   date:     "2024-03-15T..." → "Mar 15, 2024"
//   string:   "Amit Cohen"   → "Amit Cohen"  (no change)
//   null/""   (any type)     → "Not set"     (shown in grey)
export function formatCellValue(column, value) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (column.type === "boolean") {
    // the cell component then wraps this in a coloured pill (green for Yes, dark for No).
    return value ? "Yes" : "No";
  }

  if (column.type === "number") {
    if (column.format === "currency") {
      // "120,000$" — commas added by Intl.NumberFormat, $ appended manually on the right.
      return `${currencyAmountFormatter.format(value)}$`;
    }
    // regular number: up to 2 decimal places with commas. 3.14159 → "3.14"
    return numberFormatter.format(value);
  }

  if (column.type === "select" || column.type === "selection") {
    // look up the display label so we show "Frontend" even if the stored value is "frontend".
    const matchingOption = normalizeOptions(column.options).find(
      (option) => option.value === value,
    );
    return matchingOption ? matchingOption.label : String(value);
  }

  if (column.type === "date") {
    // stored ISO string → readable date. "2024-03-15T00:00:00.000Z" → "Mar 15, 2024"
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not set" : dateFormatter.format(date);
  }

  return String(value);
}

/**
 * Convert a stored ISO date string to the `"YYYY-MM-DD"` format required by
 * `<input type="date">`. Returns `""` when the value is missing or invalid.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
// the browser's <input type="date"> needs a "YYYY-MM-DD" string as its value.
// but we store dates as full ISO strings ("2024-03-15T00:00:00.000Z").
// this function converts between the two when we open the date editor.
//
// example: "2024-03-15T00:00:00.000Z" → "2024-03-15"
//          null or ""                  → "" (empty input)
export function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  // toISOString() returns "2024-03-15T00:00:00.000Z" — we only need the first 10 characters.
  return date.toISOString().slice(0, 10);
}

/**
 * Return the CSS text-alignment class suffix for a column: `"left"`, `"right"`, or `"center"`.
 *
 * @param {ColumnDef} column
 * @returns {"left" | "right" | "center"}
 */
// returns the text alignment for a column so cells look conventional:
//   numbers  → right-aligned  (like a spreadsheet: "120,000$" sits against the right edge)
//   booleans → center-aligned (the Yes/No pill is small and looks better centered)
//   strings, dates, selects → left-aligned (normal reading direction)
export function getColumnAlignment(column) {
  if (column.type === "number") {
    return "right";
  }

  if (column.type === "boolean") {
    return "center";
  }

  return "left";
}

/*
 * Global search across all visible columns.
 *
 * The operator decides how the query is compared to each cell:
 *   - contains    -> cell.includes(query)
 *   - equals      -> cell === query
 *   - startsWith  -> cell.startsWith(query)
 *   - endsWith    -> cell.endsWith(query)
 *
 * I only look at visible columns so the user doesn't get matches on data
 * they can't actually see -- that would feel confusing.
 *
 * For 2,500 rows this runs in well under a millisecond, so I didn't add a
 * debounce. If the data set were 100k+ I'd debounce the input.
 */

// List of operators the UI exposes. Keeping it in one place means the
// dropdown in the toolbar and the matcher below can't drift apart.
export const FILTER_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
];

export const DEFAULT_FILTER_OPERATOR = "contains";

export function filterRows(rows, query, columns, operator = DEFAULT_FILTER_OPERATOR) {
  const trimmed = (query ?? "").trim().toLowerCase();
  if (!trimmed) {
    return rows;
  }

  const matches = matcherFor(operator);

  return rows.filter((row) =>
    columns.some((column) => {
      const cellText = String(row[column.id] ?? "").toLowerCase();
      return matches(cellText, trimmed);
    }),
  );
}

function matcherFor(operator) {
  if (operator === "equals") {
    return (cell, query) => cell === query;
  }
  if (operator === "startsWith") {
    return (cell, query) => cell.startsWith(query);
  }
  if (operator === "endsWith") {
    return (cell, query) => cell.endsWith(query);
  }
  // "contains" is the safe default.
  return (cell, query) => cell.includes(query);
}

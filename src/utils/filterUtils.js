/*
 * Global search across all visible columns. I only look at visible columns
 * so the user doesn't get matches on data they can't actually see — that
 * would feel confusing.
 *
 * For 2,500 rows this runs in well under a millisecond, so I didn't add a
 * debounce. If the data set were 100k+ I'd debounce the input.
 */

export function filterRows(rows, query, columns) {
  const trimmed = (query ?? "").trim().toLowerCase();
  if (!trimmed) {
    return rows;
  }

  return rows.filter((row) =>
    columns.some((column) =>
      String(row[column.id] ?? "").toLowerCase().includes(trimmed),
    ),
  );
}

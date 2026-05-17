// Keeps columns in the order defined by ordinalNo.
// A copy is returned so the original schema is never mutated.
export function sortColumns(columns) {
  return [...columns].sort((left, right) => left.ordinalNo - right.ordinalNo);
}

// Returns only columns selected by the user.
// The order still comes from the column schema, not from the visibility array.
export function getVisibleColumns(columns, visibleColumnIds) {
  const visibleSet = new Set(visibleColumnIds);
  return sortColumns(columns).filter((column) => visibleSet.has(column.id));
}

// Toggles one column id while preventing a completely empty table.
export function toggleColumnId(visibleColumnIds, columnId) {
  if (visibleColumnIds.includes(columnId)) {
    if (visibleColumnIds.length === 1) {
      return visibleColumnIds;
    }

    return visibleColumnIds.filter((id) => id !== columnId);
  }

  return [...visibleColumnIds, columnId];
}

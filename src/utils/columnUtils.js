// Sort columns by their ordinalNo. I copy the array first so I don't mutate
// the schema that the caller passed in.
export function sortColumns(columns) {
  return [...columns].sort((left, right) => left.ordinalNo - right.ordinalNo);
}

// Return only the columns the user picked, but keep the order from the schema.
// If we used the order of visibleColumnIds the columns would jump around when
// users toggle them on and off.
export function getVisibleColumns(columns, visibleColumnIds) {
  const visibleSet = new Set(visibleColumnIds);
  return sortColumns(columns).filter((column) => visibleSet.has(column.id));
}

// Add or remove one column id from the visible list. I keep at least one
// column visible because an empty table looks broken.
export function toggleColumnId(visibleColumnIds, columnId) {
  if (visibleColumnIds.includes(columnId)) {
    if (visibleColumnIds.length === 1) {
      return visibleColumnIds;
    }

    return visibleColumnIds.filter((id) => id !== columnId);
  }

  return [...visibleColumnIds, columnId];
}

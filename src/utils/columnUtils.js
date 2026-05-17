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

// Merge stored visibility with the current schema:
// - remove ids that no longer exist
// - append new schema ids that were not present when localStorage was saved
// This keeps localStorage useful without hiding newly added columns forever.
export function reconcileVisibleColumnIds(storedIds, allColumnIds) {
  if (!Array.isArray(storedIds) || storedIds.length === 0) {
    return allColumnIds;
  }

  const allIdsSet = new Set(allColumnIds);
  const nextIds = storedIds.filter((id) => allIdsSet.has(id));

  for (const id of allColumnIds) {
    if (!nextIds.includes(id)) {
      nextIds.push(id);
    }
  }

  return nextIds.length > 0 ? nextIds : allColumnIds;
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

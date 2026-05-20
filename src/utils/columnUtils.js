export function sortColumns(columns) {
  return [...columns].sort((left, right) => left.ordinalNo - right.ordinalNo);
}

export function getVisibleColumns(columns, visibleColumnIds) {
  const visibleSet = new Set(visibleColumnIds);
  return sortColumns(columns).filter((column) => visibleSet.has(column.id));
}

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

export function toggleColumnId(visibleColumnIds, columnId) {
  if (visibleColumnIds.includes(columnId)) {

    if (visibleColumnIds.length === 1) {
      return visibleColumnIds;
    }

    return visibleColumnIds.filter((id) => id !== columnId);
  }

  return [...visibleColumnIds, columnId];
}

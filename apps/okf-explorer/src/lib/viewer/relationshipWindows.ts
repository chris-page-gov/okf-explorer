export type RelationshipEndpoints = { source: string; target: string };

export type RelationshipWindow<T> = {
  rows: T[];
  total: number;
  offset: number;
  end: number;
  pageSize: number;
  previous: number | null;
  next: number | null;
};

/** Page the loaded rows without changing their order, meaning or direction. */
export function relationshipWindow<T>(rows: readonly T[], requestedOffset = 0, pageSize = 72): RelationshipWindow<T> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 180) {
    throw new Error('Relationship page size must be an integer from 1 to 180.');
  }
  const last = Math.max(0, Math.floor((rows.length - 1) / pageSize) * pageSize);
  const requested = Number.isSafeInteger(requestedOffset) ? Math.max(0, requestedOffset) : 0;
  const offset = Math.min(last, Math.floor(requested / pageSize) * pageSize);
  const end = Math.min(rows.length, offset + pageSize);
  return {
    rows: rows.slice(offset, end), total: rows.length, offset, end, pageSize,
    previous: offset > 0 ? Math.max(0, offset - pageSize) : null,
    next: end < rows.length ? end : null
  };
}

/** A reduction selects actual record routes, not a particular route prefix. */
export function visibleIncidentRelationships<T extends RelationshipEndpoints>(
  rows: readonly T[], visibleRoutes: ReadonlySet<string> | null
): readonly T[] {
  return visibleRoutes === null ? rows : rows.filter((row) => (
    visibleRoutes.has(row.source) || visibleRoutes.has(row.target)
  ));
}

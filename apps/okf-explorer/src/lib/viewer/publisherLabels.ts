export type PublisherTitleRecord = {
  publisher?: string;
  publisher_title?: string;
};

function nonEmpty(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Resolve a publisher label from full-index metadata or an exact loaded record. */
export function sourcePublisherTitle(
  publisher: string,
  indexedTitle: string | undefined,
  ...loadedRecordGroups: Iterable<PublisherTitleRecord>[]
): string | undefined {
  const indexed = nonEmpty(indexedTitle);
  if (indexed) return indexed;

  for (const loadedRecords of loadedRecordGroups) {
    for (const record of loadedRecords) {
      if (record.publisher !== publisher) continue;
      const recordTitle = nonEmpty(record.publisher_title);
      if (recordTitle) return recordTitle;
    }
  }
  return undefined;
}

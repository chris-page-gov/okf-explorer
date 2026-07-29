const LARGE_CORPUS_SCHEMA = 'okf-explorer-large-corpus.v1';
const LARGE_CORPUS_KIND = 'okf-large-corpus';

export function isLargeCorpusDescriptor(
  value: Record<string, unknown>
): boolean {
  const schema = typeof value.schema === 'string' ? value.schema : '';
  const kind = typeof value.kind === 'string' ? value.kind : '';
  const declaresLargeSchema = schema.startsWith('okf-explorer-large-corpus.');
  const declaresLargeKind = kind === LARGE_CORPUS_KIND;

  if (declaresLargeSchema !== declaresLargeKind) {
    throw new Error(
      `Large-corpus descriptor identity mismatch: schema ${schema || '<missing>'} and kind ${kind || '<missing>'}`
    );
  }
  if (declaresLargeKind && schema !== LARGE_CORPUS_SCHEMA) {
    throw new Error(`Unsupported large-corpus descriptor schema: ${schema || '<missing>'}`);
  }
  return declaresLargeKind;
}

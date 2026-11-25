import { isHttpUrl } from './helpers';

export type ContextLinkInput = {
  url?: unknown;
  bundle?: unknown;
  route?: unknown;
  title?: unknown;
};

export type ResolvedContextLink = {
  href: string;
  readerTarget: boolean;
};

function safeRelativeDescriptorPath(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    value.trim() === value &&
    !value.startsWith('/') &&
    !value.startsWith('\\') &&
    !value.startsWith('//') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    !/[?#\\\u0000-\u001f\u007f\s]/.test(value);
}

function safeRoute(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    value.trim() === value &&
    !value.startsWith('/') &&
    !value.startsWith('#') &&
    !/[?#\\\u0000-\u001f\u007f\s]/.test(value);
}

/**
 * Resolve a context link from a large-bundle record. Existing absolute web
 * links remain external resources. Structured Reader links resolve their
 * descriptor relative to the loaded descriptor URL, while keeping the current
 * Reader's own origin and application path.
 */
export function resolveContextLink(
  input: ContextLinkInput,
  loadedDescriptorUrl: string,
  readerHref: string
): ResolvedContextLink | null {
  if (typeof input.url === 'string' && isHttpUrl(input.url)) {
    return { href: input.url, readerTarget: false };
  }

  if (
    !safeRelativeDescriptorPath(input.bundle) ||
    !safeRoute(input.route) ||
    typeof input.title !== 'string' ||
    !input.title.trim() ||
    input.title.length > 512 ||
    !isHttpUrl(loadedDescriptorUrl) ||
    !isHttpUrl(readerHref)
  ) return null;

  try {
    const descriptor = new URL(input.bundle, loadedDescriptorUrl);
    const reader = new URL(readerHref);
    if (
      !['http:', 'https:'].includes(descriptor.protocol) ||
      descriptor.username ||
      descriptor.password ||
      !['http:', 'https:'].includes(reader.protocol)
    ) return null;

    reader.search = '';
    reader.hash = '';
    reader.searchParams.set('bundle', descriptor.toString());
    reader.searchParams.set('q', input.title);
    reader.searchParams.set('view', 'reader');
    reader.hash = input.route;
    const href = reader.toString();
    return isHttpUrl(href) ? { href, readerTarget: true } : null;
  } catch {
    return null;
  }
}

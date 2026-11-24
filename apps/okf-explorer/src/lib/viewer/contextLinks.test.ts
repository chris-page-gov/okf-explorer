import { describe, expect, it } from 'vitest';
import { resolveContextLink } from './contextLinks';

describe('resolveContextLink', () => {
  const loadedDescriptor = 'https://data.example/ndl/discovery/okf-explorer.json';
  const reader = 'https://reader.example/okf-explorer/explore/?theme=dark';

  it('resolves an owning descriptor from the loaded bundle, not the Reader origin', () => {
    const link = resolveContextLink({
      bundle: '../directory-a/okf-explorer.json',
      route: 'dataset/12345',
      title: 'Directory A record'
    }, loadedDescriptor, reader);

    expect(link).toEqual({
      href: 'https://reader.example/okf-explorer/explore/?bundle=https%3A%2F%2Fdata.example%2Fndl%2Fdirectory-a%2Fokf-explorer.json&q=Directory+A+record&view=reader#dataset/12345',
      readerTarget: true
    });
    const resolved = new URL(link!.href);
    expect(resolved.origin).toBe('https://reader.example');
    expect(resolved.pathname).toBe('/okf-explorer/explore/');
    expect(resolved.searchParams.get('bundle')).toBe('https://data.example/ndl/directory-a/okf-explorer.json');
    expect(resolved.searchParams.get('q')).toBe('Directory A record');
    expect(resolved.searchParams.get('view')).toBe('reader');
    expect(resolved.hash).toBe('#dataset/12345');
  });

  it('keeps existing absolute HTTP(S) context resources external', () => {
    expect(resolveContextLink({ url: 'https://example.test/source' }, loadedDescriptor, reader))
      .toEqual({ href: 'https://example.test/source', readerTarget: false });
  });

  it.each([
    ['protocol-relative descriptor', '//attacker.test/okf-explorer.json'],
    ['root-relative descriptor', '/directory-a/okf-explorer.json'],
    ['script scheme', 'javascript:alert(1)'],
    ['backslash path', '..\\directory-a\\okf-explorer.json'],
    ['query in path', '../directory-a/okf-explorer.json?override=1'],
    ['fragment in path', '../directory-a/okf-explorer.json#other']
  ])('rejects unsafe %s targets', (_label, bundle) => {
    expect(resolveContextLink({ bundle, route: 'dataset/12345', title: 'Directory A record' }, loadedDescriptor, reader))
      .toBeNull();
  });

  it('rejects malformed routes, titles and non-web descriptor origins', () => {
    expect(resolveContextLink({ bundle: '../directory-a/okf-explorer.json', route: '#route', title: 'Record' }, loadedDescriptor, reader)).toBeNull();
    expect(resolveContextLink({ bundle: '../directory-a/okf-explorer.json', route: 'dataset/12345', title: ' ' }, loadedDescriptor, reader)).toBeNull();
    expect(resolveContextLink({ bundle: '../directory-a/okf-explorer.json', route: 'dataset/12345', title: 'Record' }, 'file:///tmp/okf-explorer.json', reader)).toBeNull();
  });
});

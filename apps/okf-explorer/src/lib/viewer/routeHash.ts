/** Serialise record routes into fragments without letting URI decoding change them. */
export function routeHash(route: string): string {
  // The reader decodes ordinary fragments once. Routes containing a percent
  // escape therefore need an opaque token so encoded path separators survive.
  if (!route.includes('%') && !route.startsWith('record:')) return route;
  const bytes = new TextEncoder().encode(route);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const token = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `record:${token}`;
}

/** Read ordinary and opaque record fragments using the same route contract. */
export function routeFromHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('record:')) return decoded;
    const token = decoded.slice('record:'.length);
    if (!/^[A-Za-z0-9_-]+$/.test(token)) return decoded;
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return raw;
  }
}

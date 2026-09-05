export const BOOKMARK_STORAGE_KEY = 'okf-explorer:bookmarks:v2';
export type Bookmark = { bundle: string; route: string; label: string; url: string; version?: string };
export function addBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  return [bookmark, ...bookmarks.filter(item => item.bundle !== bookmark.bundle || item.route !== bookmark.route)].slice(0, 40);
}
export function readBookmarks(raw: string | null): Bookmark[] {
  try {
    const items: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(items)) return [];
    return items.slice(0, 40).filter((row): row is Bookmark => row &&
      ['bundle', 'route', 'label', 'url'].every(key => typeof row[key] === 'string' && row[key].length <= 20_000) &&
      /^https?:\/\//.test(row.url) && /^https?:\/\//.test(row.bundle));
  } catch { return []; }
}

export type ExplorerTheme = 'system' | 'light' | 'dark';

const themeKey = 'okf-explorer-theme-v1';

export function readExplorerTheme(): ExplorerTheme {
  let value = document.documentElement.dataset.explorerTheme;
  if (!value) {
    try { value = localStorage.getItem(themeKey) ?? undefined; }
    catch { /* Use the system preference if storage is unavailable. */ }
  }
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function applyExplorerTheme(value: ExplorerTheme): void {
  document.documentElement.dataset.explorerTheme = value;
  try {
    if (value === 'system') localStorage.removeItem(themeKey);
    else localStorage.setItem(themeKey, value);
  } catch {
    // The current choice remains usable when storage is unavailable.
  }
}

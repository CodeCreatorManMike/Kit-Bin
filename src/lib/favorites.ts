const KEY = 'kitbin:favorites';
export const FAVORITES_CHANGED_EVENT = 'kitbin:favorites-changed';

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

export function toggleFavorite(slug: string): boolean {
  const current = getFavorites();
  const idx = current.indexOf(slug);
  if (idx === -1) current.push(slug);
  else current.splice(idx, 1);
  localStorage.setItem(KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
  return idx === -1;
}

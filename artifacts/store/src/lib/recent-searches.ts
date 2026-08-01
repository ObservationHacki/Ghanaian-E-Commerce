import { readMigratedStorage } from '@/lib/brand';

const STORAGE_KEY = 'vbuy_recent_searches';
const LEGACY_KEY = 'kumasi_recent_searches';
const MAX = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = readMigratedStorage(STORAGE_KEY, LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (!clean) return getRecentSearches();
  const next = [clean, ...getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — history simply won't persist */
  }
  return next;
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* no-op */
  }
  return [];
}

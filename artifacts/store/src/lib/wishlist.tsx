import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readMigratedStorage } from '@/lib/brand';

const STORAGE_KEY = 'vbuy_wishlist';
const LEGACY_KEY = 'kumasi_wishlist';

function read(): number[] {
  try {
    const raw = readMigratedStorage(STORAGE_KEY, LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

type WishlistValue = {
  ids: number[];
  has: (id: number) => boolean;
  toggle: (id: number) => boolean;
  remove: (id: number) => void;
  clear: () => void;
  count: number;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(() =>
    typeof window === 'undefined' ? [] : read(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable (private mode) — wishlist stays in-memory */
    }
  }, [ids]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((id: number) => {
    let added = false;
    setIds((prev) => {
      added = !prev.includes(id);
      return added ? [id, ...prev] : prev.filter((v) => v !== id);
    });
    return added;
  }, []);

  const remove = useCallback((id: number) => {
    setIds((prev) => prev.filter((v) => v !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<WishlistValue>(
    () => ({
      ids,
      has: (id: number) => ids.includes(id),
      toggle,
      remove,
      clear,
      count: ids.length,
    }),
    [ids, toggle, remove, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}

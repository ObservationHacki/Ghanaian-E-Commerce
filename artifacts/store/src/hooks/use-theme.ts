import { useCallback, useEffect, useState } from 'react';
import { readMigratedStorage } from '@/lib/brand';

const STORAGE_KEY = 'vbuy_theme';

/** Mirrors the pre-paint script in index.html, which sets the initial class. */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    if (document.documentElement.classList.contains('dark')) return true;
    return readMigratedStorage(STORAGE_KEY, 'kumasi_theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((v) => !v), []);

  return { isDark, toggle };
}

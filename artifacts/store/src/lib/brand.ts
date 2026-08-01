/** Site brand — single source for display names and storage keys. */
export const BRAND = {
  name: 'VBUY',
  legalName: 'VBUY',
  tagline: 'Premium tech, fashion & home in Ghana',
  email: 'hello@vbuy.com',
  homeAriaLabel: 'VBUY home',
  adminName: 'VBUY Admin',
} as const;

/** Read a localStorage key, migrating from a legacy Kumasi key once. */
export function readMigratedStorage(newKey: string, legacyKey: string): string | null {
  try {
    const current = localStorage.getItem(newKey);
    if (current != null) return current;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy != null) {
      localStorage.setItem(newKey, legacy);
      localStorage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

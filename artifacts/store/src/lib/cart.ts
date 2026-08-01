import { v4 as uuidv4 } from 'uuid';
import { readMigratedStorage } from '@/lib/brand';

const KEY = 'vbuy_cart_id';
const LEGACY_KEY = 'kumasi_cart_id';

export function getCartSessionId(): string {
  let id = readMigratedStorage(KEY, LEGACY_KEY);
  if (!id) {
    id = uuidv4();
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

import {
  Smartphone,
  Laptop,
  Headphones,
  Shirt,
  Home,
  Gamepad2,
  Watch,
  Sparkles,
  UtensilsCrossed,
  Baby,
  Camera,
  Tv,
  Dumbbell,
  BookOpen,
  Car,
  Package,
  type LucideIcon,
} from 'lucide-react';

/**
 * Category slugs come from the API, so icons are matched by keyword rather than
 * an exact map — a new category added in the admin still gets a sensible icon.
 */
const ICON_KEYWORDS: Array<[RegExp, LucideIcon]> = [
  [/phone|mobile|smartphone|tablet/i, Smartphone],
  [/laptop|computer|pc|notebook/i, Laptop],
  [/audio|headphone|speaker|sound|accessor/i, Headphones],
  [/fashion|cloth|apparel|wear|shoe/i, Shirt],
  [/home|furniture|decor|living/i, Home],
  [/gaming|game|console/i, Gamepad2],
  [/watch|wearable/i, Watch],
  [/beauty|cosmetic|skin|care|health/i, Sparkles],
  [/kitchen|cook|applian/i, UtensilsCrossed],
  [/kid|baby|child|toy/i, Baby],
  [/camera|photo/i, Camera],
  [/tv|television|display|monitor/i, Tv],
  [/sport|fitness|gym|outdoor/i, Dumbbell],
  [/book|stationer|office/i, BookOpen],
  [/car|auto|vehicle/i, Car],
];

export function getCategoryIcon(...hints: Array<string | null | undefined>): LucideIcon {
  const haystack = hints.filter(Boolean).join(' ');
  for (const [pattern, icon] of ICON_KEYWORDS) {
    if (pattern.test(haystack)) return icon;
  }
  return Package;
}

/** Shown before the API responds, and as the mega-menu skeleton. */
export const FALLBACK_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home', slug: 'home' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Gaming', slug: 'gaming' },
  { name: 'Kitchen', slug: 'kitchen' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Kids', slug: 'kids' },
];

export const POPULAR_SEARCHES = [
  'iPhone 15 Pro',
  'Samsung Galaxy',
  'MacBook Air',
  'AirPods',
  'PlayStation 5',
  'Smart TV',
  'Sneakers',
  'Blender',
];

export const TRENDING_SEARCHES = [
  'Wireless earbuds',
  'Gaming laptop',
  'Air fryer',
  'Smartwatch',
  'Power bank',
];

export const FEATURED_BRANDS = [
  { name: 'Apple', slug: 'apple' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Sony', slug: 'sony' },
  { name: 'HP', slug: 'hp' },
  { name: 'Nike', slug: 'nike' },
  { name: 'Xiaomi', slug: 'xiaomi' },
  { name: 'Dell', slug: 'dell' },
  { name: 'LG', slug: 'lg' },
  { name: 'Anker', slug: 'anker' },
  { name: 'JBL', slug: 'jbl' },
];

/** Real reviews are not in the API yet — do not invent ratings for production. */
export function pseudoRating(_id: number): { rating: number; count: number } | null {
  return null;
}

/** Compare-at / markdown prices are not in the API yet. */
export function pseudoCompareAt(_id: number, _price: number): number | null {
  return null;
}

export function discountPercent(price: number, compareAt: number) {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

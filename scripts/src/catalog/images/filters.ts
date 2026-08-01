const BAD_URL_PARTS = [
  "hero",
  "banner",
  "promo",
  "campaign",
  "homepage",
  "landing",
  "carousel",
  "slider",
  "marketing",
  "cms",
  "ads",
  "/ad/",
  "advert",
  "sprite",
  "icon",
  "logo",
  "placeholder",
  "skeleton",
  "lazyload",
  "spacer",
  "1x1",
  "blank.",
  "pixel.",
];

const BAD_ALT = [
  "banner",
  "hero",
  "promotion",
  "sale",
  "advertisement",
  "logo",
  "icon",
];

const BAD_CONTAINER =
  /\b(hero|banner|slider|carousel|ad|ads|header|footer|navigation|nav|promo|marketing)\b/i;

export function isBadUrl(url: string): string | null {
  const lower = url.toLowerCase();
  for (const part of BAD_URL_PARTS) {
    if (lower.includes(part)) return `url-contains:${part}`;
  }
  if (/\.svg(\?|$)/i.test(lower)) return "svg";
  if (/data:image\/svg/i.test(lower)) return "svg-data";
  return null;
}

export function isBadAlt(alt: string | undefined): string | null {
  if (!alt) return null;
  const lower = alt.toLowerCase();
  for (const part of BAD_ALT) {
    if (lower.includes(part)) return `alt-contains:${part}`;
  }
  return null;
}

export function isBadContainer(classOrId: string | undefined): string | null {
  if (!classOrId) return null;
  if (BAD_CONTAINER.test(classOrId)) return `container:${classOrId.slice(0, 40)}`;
  return null;
}

export function isPlaceholderUrl(url: string): boolean {
  return /placeholder|data:image\/gif|loading\.|spinner|skeleton|lazy/i.test(url);
}

/** Aspect ratio must be between 0.6 and 1.8 inclusive. */
export function isValidAspect(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio >= 0.6 && ratio <= 1.8;
}

export function isTiny(width?: number, height?: number): boolean {
  if (width != null && width > 0 && width < 500) return true;
  if (height != null && height > 0 && height < 500) return true;
  return false;
}

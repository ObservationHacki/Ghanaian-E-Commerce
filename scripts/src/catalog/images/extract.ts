import type { ImageCandidate } from "./types";
import {
  isBadAlt,
  isBadContainer,
  isBadUrl,
  isPlaceholderUrl,
} from "./filters";

function absUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function filenameOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
  } catch {
    return "";
  }
}

function pushUnique(
  list: ImageCandidate[],
  candidate: ImageCandidate,
): void {
  if (!candidate.url) return;
  if (list.some((c) => c.url === candidate.url)) return;
  const bad =
    isBadUrl(candidate.url) ||
    isBadAlt(candidate.alt) ||
    (isPlaceholderUrl(candidate.url) ? "placeholder" : null);
  if (bad) {
    candidate.rejectReason = bad;
  }
  list.push(candidate);
}

function extractJsonLd(html: string, pageUrl: string): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        walkJsonLd(node, pageUrl, out);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return out;
}

function walkJsonLd(node: unknown, pageUrl: string, out: ImageCandidate[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = String(obj["@type"] || "").toLowerCase();

  if (type.includes("product") || obj.image) {
    const images = obj.image;
    const list = Array.isArray(images)
      ? images
      : typeof images === "string"
        ? [images]
        : images && typeof images === "object" && "url" in (images as object)
          ? [(images as { url: string }).url]
          : [];
    for (const img of list) {
      if (typeof img !== "string") continue;
      const url = absUrl(img, pageUrl);
      if (!url) continue;
      pushUnique(out, {
        url,
        sourcePage: pageUrl,
        origin: "json-ld",
        filename: filenameOf(url),
        inGallery: true,
      });
    }
  }

  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) walkJsonLd(child, pageUrl, out);
  }
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  return html.match(re)?.[1] || html.match(re2)?.[1] || null;
}

function extractImgs(html: string, pageUrl: string): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  const imgRe = /<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const attrs = m[1] || "";
    const src =
      attrs.match(/\b(?:data-src|data-original|data-lazy-src|src)=["']([^"']+)["']/i)?.[1] ||
      "";
    const alt = attrs.match(/\balt=["']([^"']*)["']/i)?.[1] || "";
    const cls =
      (attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || "") +
      " " +
      (attrs.match(/\bid=["']([^"']*)["']/i)?.[1] || "");
    const w = Number(attrs.match(/\bwidth=["']?(\d+)/i)?.[1] || 0) || undefined;
    const h = Number(attrs.match(/\bheight=["']?(\d+)/i)?.[1] || 0) || undefined;
    const url = absUrl(src, pageUrl);
    if (!url) continue;

    const containerBad = isBadContainer(cls);
    let origin: ImageCandidate["origin"] = "largest";
    const clsLower = cls.toLowerCase();
    if (/gallery|product-image|product__media|pdp-gallery|swiper-slide/i.test(clsLower)) {
      origin = "gallery";
    } else if (/thumbnail|thumb|thumbnails/i.test(clsLower)) {
      origin = "thumbnail-gallery";
    } else if (/main|primary|featured.?image|product.?main/i.test(clsLower)) {
      origin = "main";
    }

    const candidate: ImageCandidate = {
      url,
      sourcePage: pageUrl,
      alt,
      width: w,
      height: h,
      origin,
      filename: filenameOf(url),
      inGallery: origin === "gallery" || origin === "thumbnail-gallery",
    };
    if (containerBad) candidate.rejectReason = containerBad;
    pushUnique(out, candidate);
  }
  return out;
}

/**
 * Extract product image candidates from a product page HTML document.
 * Priority origins are tagged; bad images get rejectReason but stay in the
 * list for logging until the pipeline filters them.
 */
export function extractProductImages(
  html: string,
  pageUrl: string,
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  for (const c of extractJsonLd(html, pageUrl)) pushUnique(candidates, c);

  const og = metaContent(html, "og:image") || metaContent(html, "og:image:secure_url");
  if (og) {
    const url = absUrl(og, pageUrl);
    if (url) {
      pushUnique(candidates, {
        url,
        sourcePage: pageUrl,
        origin: "og",
        filename: filenameOf(url),
      });
    }
  }

  const tw = metaContent(html, "twitter:image") || metaContent(html, "twitter:image:src");
  if (tw) {
    const url = absUrl(tw, pageUrl);
    if (url) {
      pushUnique(candidates, {
        url,
        sourcePage: pageUrl,
        origin: "twitter",
        filename: filenameOf(url),
      });
    }
  }

  for (const c of extractImgs(html, pageUrl)) pushUnique(candidates, c);

  // Prefer ordered by extraction priority for stable scoring ties.
  const order: Record<ImageCandidate["origin"], number> = {
    "json-ld": 0,
    gallery: 1,
    main: 2,
    "thumbnail-gallery": 3,
    og: 4,
    twitter: 5,
    largest: 6,
    fallback: 7,
  };
  candidates.sort((a, b) => order[a.origin] - order[b.origin]);
  return candidates;
}

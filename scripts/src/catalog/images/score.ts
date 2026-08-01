import type { ImageCandidate, ProductRef } from "./types";
import { isValidAspect } from "./filters";

function tokensFromProduct(product: ProductRef): string[] {
  const parts = product.name.split(/\s*·\s*/).map((p) => p.trim());
  const model = (parts[1] || "").toLowerCase();
  const brand = (product.brand || parts[0] || "").toLowerCase();
  const raw = `${brand} ${model} ${product.name}`.toLowerCase();
  return raw
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

export function scoreCandidate(
  candidate: ImageCandidate,
  product: ProductRef,
): number {
  let score = 0;
  const url = candidate.url.toLowerCase();
  const alt = (candidate.alt || "").toLowerCase();
  const file = (candidate.filename || "").toLowerCase();
  const tokens = tokensFromProduct(product);

  if (candidate.inGallery || candidate.origin === "gallery") score += 50;
  if (candidate.origin === "json-ld") score += 40;
  if (candidate.origin === "main") score += 35;
  if (candidate.origin === "thumbnail-gallery") score += 20;
  if (candidate.origin === "og") score += 15;
  if (candidate.origin === "twitter") score += 10;

  for (const tok of tokens) {
    if (file.includes(tok) || url.includes(tok)) score += 30;
    if (alt.includes(tok)) score += 20;
  }

  const w = candidate.width || 0;
  const h = candidate.height || 0;
  if (w >= 800 && h >= 800) score += 10;
  else if (w >= 500 && h >= 500) score += 6;

  if (w && h) {
    const ratio = w / h;
    if (ratio >= 0.85 && ratio <= 1.2) score += 12; // prefer near-square
    if (!isValidAspect(w, h)) score -= 30;
    if (ratio > 2.2 || ratio < 0.45) score -= 30;
  }

  if (/banner|hero|marketing|promo|campaign/i.test(url + alt + file)) score -= 100;
  if (/multi.?pack|bundle|family|collection|group/i.test(alt + file)) score -= 50;

  return score;
}

export function rankCandidates(
  candidates: ImageCandidate[],
  product: ProductRef,
): ImageCandidate[] {
  return candidates
    .filter((c) => !c.rejectReason)
    .map((c) => ({ ...c, score: scoreCandidate(c, product) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

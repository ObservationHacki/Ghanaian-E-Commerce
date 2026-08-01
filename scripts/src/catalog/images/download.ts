import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { StoredImagePaths } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!type.startsWith("image/") || type.includes("svg")) {
    throw new Error(`Not a raster image: ${type}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 12_000) throw new Error(`File too small: ${buf.length}`);
  if (buf.length > 12_000_000) throw new Error(`File too large: ${buf.length}`);
  return buf;
}

export async function probeImage(
  buf: Buffer,
): Promise<{ width: number; height: number; format: string }> {
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) throw new Error("Missing dimensions");
  return {
    width: meta.width,
    height: meta.height,
    format: meta.format || "jpeg",
  };
}

/**
 * Write original + large/medium/thumbnail WebP variants under
 * public/products/{productId}/
 */
export async function storeImageVariants(
  productId: number,
  buf: Buffer,
  publicRoot: string,
): Promise<StoredImagePaths> {
  const dir = path.join(publicRoot, String(productId));
  await fs.mkdir(dir, { recursive: true });

  const meta = await sharp(buf).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const ext =
    meta.format === "png"
      ? "png"
      : meta.format === "webp"
        ? "webp"
        : meta.format === "gif"
          ? "gif"
          : "jpg";

  const originalRel = `/products/${productId}/original.${ext}`;
  const largeRel = `/products/${productId}/large.webp`;
  const mediumRel = `/products/${productId}/medium.webp`;
  const thumbRel = `/products/${productId}/thumbnail.webp`;

  await fs.writeFile(path.join(publicRoot, String(productId), `original.${ext}`), buf);

  await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(dir, "large.webp"));

  await sharp(buf)
    .rotate()
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(dir, "medium.webp"));

  await sharp(buf)
    .rotate()
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(dir, "thumbnail.webp"));

  const largeMeta = await sharp(path.join(dir, "large.webp")).metadata();

  return {
    originalPath: originalRel,
    largePath: largeRel,
    mediumPath: mediumRel,
    thumbnailPath: thumbRel,
    width: largeMeta.width || width,
    height: largeMeta.height || height,
    mimeType: "image/webp",
    bytes: buf.length,
  };
}

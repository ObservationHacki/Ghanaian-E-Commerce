import fs from "node:fs/promises";
import path from "node:path";
import {
  fetchImageBuffer,
  probeImage,
  storeImageVariants,
} from "./download";
import { extractProductImages } from "./extract";
import { isTiny, isValidAspect } from "./filters";
import { appendPipelineLog, formatConsoleLog } from "./logger";
import { assessImageQuality } from "./quality";
import { rankCandidates } from "./score";
import {
  buildSearchQuery,
  fetchPageHtml,
  searchProductPages,
} from "./search";
import type {
  ImageCandidate,
  PipelineLog,
  ProductRef,
  StoredImagePaths,
} from "./types";
import { verifyImageMatch, visionConfigured } from "./vision";

const CONFIDENCE_THRESHOLD = 0.9;
const QUALITY_THRESHOLD = 80;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type PipelineOptions = {
  publicRoot: string;
  logDir: string;
  /** Skip AI when no key / for dry migration dry-runs. Default false. */
  allowUnverified?: boolean;
  maxPages?: number;
  maxCandidates?: number;
  quiet?: boolean;
};

export type PipelineSuccess = {
  ok: true;
  paths: StoredImagePaths;
  source: string;
  confidence: number;
  qualityScore: number;
  verified: boolean;
  width: number;
  height: number;
};

export type PipelineFailure = {
  ok: false;
  error: string;
  log: PipelineLog;
};

async function collectCandidates(
  product: ProductRef,
  maxPages: number,
): Promise<ImageCandidate[]> {
  const pages = await searchProductPages(product, maxPages);
  const all: ImageCandidate[] = [];
  for (const pageUrl of pages) {
    const html = await fetchPageHtml(pageUrl);
    if (!html) continue;
    const extracted = extractProductImages(html, pageUrl);
    for (const c of extracted) all.push(c);
    await sleep(250);
  }
  return all;
}

async function tryCandidate(
  product: ProductRef,
  candidate: ImageCandidate,
  opts: PipelineOptions,
): Promise<{
  reject?: string;
  success?: PipelineSuccess;
  dimensions?: { width: number; height: number };
  confidence?: number;
  qualityScore?: number;
}> {
  let buf: Buffer;
  try {
    buf = await fetchImageBuffer(candidate.url);
  } catch (err) {
    return { reject: `download:${(err as Error).message}` };
  }

  let probe: { width: number; height: number; format: string };
  try {
    probe = await probeImage(buf);
  } catch (err) {
    return { reject: `probe:${(err as Error).message}` };
  }

  if (isTiny(probe.width, probe.height)) {
    return {
      reject: `tiny:${probe.width}x${probe.height}`,
      dimensions: { width: probe.width, height: probe.height },
    };
  }
  if (!isValidAspect(probe.width, probe.height)) {
    return {
      reject: `aspect:${(probe.width / probe.height).toFixed(2)}`,
      dimensions: { width: probe.width, height: probe.height },
    };
  }

  let confidence = 0;
  let verified = false;

  if (opts.allowUnverified && !visionConfigured()) {
    confidence = 0;
    verified = false;
  } else if (!visionConfigured() && !opts.allowUnverified) {
    return { reject: "no-vision-api-key" };
  } else if (visionConfigured()) {
    try {
      const vision = await verifyImageMatch({
        productTitle: product.name,
        imageUrl: candidate.url,
        imageBytes: buf,
        mimeType: `image/${probe.format === "jpg" ? "jpeg" : probe.format}`,
      });
      confidence = vision.confidence;
      verified = vision.match && confidence >= CONFIDENCE_THRESHOLD;
      if (!verified) {
        return {
          reject: `ai:${vision.match ? "low-confidence" : "no-match"}:${confidence.toFixed(2)}:${vision.reason || ""}`,
          dimensions: { width: probe.width, height: probe.height },
          confidence,
        };
      }
    } catch (err) {
      if (opts.allowUnverified) {
        confidence = 0;
        verified = false;
      } else {
        return { reject: `ai-error:${(err as Error).message}` };
      }
    }
  }

  const quality = assessImageQuality({
    width: probe.width,
    height: probe.height,
    bytes: buf.length,
    format: probe.format,
    sourceUrl: candidate.url,
    // --allow-unverified skips AI; don't fail the quality gate on confidence.
    confidence: opts.allowUnverified && !verified ? 1 : confidence,
    verified: verified || Boolean(opts.allowUnverified),
  });

  if (quality.score < QUALITY_THRESHOLD) {
    return {
      reject: quality.rejectReason || `quality:${quality.score}`,
      dimensions: { width: probe.width, height: probe.height },
      confidence,
      qualityScore: quality.score,
    };
  }

  // New assets live under products/{id}/… — legacy flat files
  // (products/{id}.jpg) are left untouched until the caller updates the DB
  // and calls cleanupLegacyFlatFiles.
  const paths = await storeImageVariants(product.id, buf, opts.publicRoot);

  return {
    success: {
      ok: true,
      paths,
      source: candidate.url,
      confidence,
      qualityScore: quality.score,
      verified,
      width: paths.width,
      height: paths.height,
    },
    dimensions: { width: probe.width, height: probe.height },
    confidence,
    qualityScore: quality.score,
  };
}

/**
 * Scrape → extract → score → AI verify → quality → store locally.
 * Does not touch the database; caller persists after success.
 */
export async function scrapeProductImage(
  product: ProductRef,
  opts: PipelineOptions,
): Promise<PipelineSuccess | PipelineFailure> {
  const log: PipelineLog = {
    productId: product.id,
    productName: product.name,
    candidates: [],
  };

  try {
    if (!opts.quiet) {
      console.log(
        `\n#${product.id} ${product.name}\n  query: ${buildSearchQuery(product)}`,
      );
    }

    const raw = await collectCandidates(product, opts.maxPages ?? 6);
    const ranked = rankCandidates(raw, product);
    const maxTry = opts.maxCandidates ?? 10;

    for (const c of ranked.slice(0, maxTry)) {
      log.candidates.push({
        url: c.url,
        origin: c.origin,
        score: c.score,
      });
    }
    // Also log rejected-at-extract for diagnostics.
    for (const c of raw.filter((x) => x.rejectReason).slice(0, 8)) {
      log.candidates.push({
        url: c.url,
        origin: c.origin,
        rejected: c.rejectReason,
      });
    }

    if (!ranked.length) {
      log.error = "no-candidates";
      await appendPipelineLog(opts.logDir, log);
      if (!opts.quiet) console.log(formatConsoleLog(log));
      return { ok: false, error: "no-candidates", log };
    }

    for (const candidate of ranked.slice(0, maxTry)) {
      const result = await tryCandidate(product, candidate, opts);
      const entry = log.candidates.find((x) => x.url === candidate.url);
      if (result.reject) {
        if (entry) entry.rejected = result.reject;
        else {
          log.candidates.push({
            url: candidate.url,
            origin: candidate.origin,
            score: candidate.score,
            rejected: result.reject,
          });
        }
        if (!opts.quiet) {
          console.log(
            `  skip [${candidate.origin}] ${result.reject} ${candidate.url.slice(0, 80)}`,
          );
        }
        await sleep(200);
        continue;
      }
      if (result.success) {
        log.accepted = {
          url: candidate.url,
          dimensions: {
            width: result.success.width,
            height: result.success.height,
          },
          confidence: result.success.confidence,
          qualityScore: result.success.qualityScore,
          paths: result.success.paths,
        };
        await appendPipelineLog(opts.logDir, log);
        if (!opts.quiet) console.log(formatConsoleLog(log));
        return result.success;
      }
    }

    log.error = "all-candidates-rejected";
    await appendPipelineLog(opts.logDir, log);
    if (!opts.quiet) console.log(formatConsoleLog(log));
    return { ok: false, error: "all-candidates-rejected", log };
  } catch (err) {
    log.error = (err as Error).message;
    await appendPipelineLog(opts.logDir, log);
    if (!opts.quiet) console.log(formatConsoleLog(log));
    return { ok: false, error: log.error, log };
  }
}

/** Remove legacy flat files `public/products/{id}.ext` after new folder is live. */
export async function cleanupLegacyFlatFiles(
  publicRoot: string,
  productId: number,
): Promise<void> {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    await fs.unlink(path.join(publicRoot, `${productId}${ext}`)).catch(() => {});
  }
}

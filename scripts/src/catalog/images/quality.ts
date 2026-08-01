import type { QualityResult } from "./types";
import { isValidAspect } from "./filters";

/**
 * Image quality service — returns 0–100. Reject below 80.
 */
export function assessImageQuality(input: {
  width: number;
  height: number;
  bytes: number;
  format: string;
  sourceUrl: string;
  confidence: number;
  verified: boolean;
  duplicateOfExisting?: boolean;
}): QualityResult {
  const checks: QualityResult["checks"] = {};
  let score = 100;

  const resOk = input.width >= 500 && input.height >= 500;
  checks.resolution = resOk;
  if (!resOk) {
    score -= 40;
  } else if (input.width >= 1000 && input.height >= 1000) {
    score += 0; // already at 100 baseline
  } else {
    score -= 10;
  }

  const aspectOk = isValidAspect(input.width, input.height);
  checks.aspectRatio = Number((input.width / input.height).toFixed(3));
  checks.aspectOk = aspectOk;
  if (!aspectOk) score -= 35;

  const ratio = input.width / input.height;
  const nearSquare = ratio >= 0.8 && ratio <= 1.25;
  checks.nearSquare = nearSquare;
  if (!nearSquare && aspectOk) score -= 5;

  const formatOk = ["jpeg", "jpg", "png", "webp"].includes(
    input.format.toLowerCase(),
  );
  checks.format = input.format;
  checks.formatOk = formatOk;
  if (!formatOk) score -= 30;

  const sizeOk = input.bytes >= 20_000 && input.bytes <= 8_000_000;
  checks.fileSize = input.bytes;
  checks.fileSizeOk = sizeOk;
  if (!sizeOk) score -= 20;

  checks.brokenUrl = false;
  checks.duplicate = Boolean(input.duplicateOfExisting);
  if (input.duplicateOfExisting) score -= 25;

  checks.aiVerified = input.verified;
  checks.confidence = input.confidence;
  if (input.verified && input.confidence >= 0.9) {
    // keep score
  } else if (input.verified && input.confidence >= 0.8) {
    score -= 10;
  } else if (!input.verified) {
    score -= 25;
  } else {
    score -= 40;
  }

  score = Math.max(0, Math.min(100, score));
  const rejectReason =
    score < 80
      ? `quality-score:${score}`
      : !resOk
        ? "resolution"
        : !aspectOk
          ? "aspect"
          : undefined;

  return { score, checks, rejectReason: score < 80 ? rejectReason : undefined };
}

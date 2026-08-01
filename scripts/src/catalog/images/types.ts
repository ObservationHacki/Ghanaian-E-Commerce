export type ImageCandidate = {
  url: string;
  sourcePage?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Extraction origin used for scoring. */
  origin:
    | "json-ld"
    | "gallery"
    | "main"
    | "thumbnail-gallery"
    | "og"
    | "twitter"
    | "largest"
    | "fallback";
  filename?: string;
  inGallery?: boolean;
  score?: number;
  rejectReason?: string;
};

export type VisionResult = {
  match: boolean;
  confidence: number;
  reason?: string;
};

export type QualityResult = {
  score: number;
  checks: Record<string, boolean | number | string>;
  rejectReason?: string;
};

export type StoredImagePaths = {
  originalPath: string;
  largePath: string;
  mediumPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  mimeType: string;
  bytes: number;
};

export type PipelineLog = {
  productId: number;
  productName: string;
  candidates: Array<{
    url: string;
    origin: string;
    score?: number;
    rejected?: string;
  }>;
  accepted?: {
    url: string;
    dimensions: { width: number; height: number };
    confidence: number;
    qualityScore: number;
    paths: StoredImagePaths;
  };
  error?: string;
};

export type ProductRef = {
  id: number;
  name: string;
  brand: string | null;
};

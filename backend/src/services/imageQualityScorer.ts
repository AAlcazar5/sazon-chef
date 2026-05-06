// backend/src/services/imageQualityScorer.ts
// ROADMAP 4.0 Tier D2.1 — Image quality scorer.
//
// Scores a recipe image on a 0-5 scale combining cheap heuristics
// (resolution + aspect ratio + stock-CDN host) with a Claude Vision
// rating ("is this food, in focus, well-lit, not stock?" 1-5).
// Vision is the primary signal — heuristics adjust around it.

import type { FailureReason } from './recipeQualityScoreService';

export const STOCK_PHOTO_HOSTS = [
  'images.unsplash.com',
  'unsplash.com',
  'images.pexels.com',
  'pexels.com',
  'cdn.pixabay.com',
  'pixabay.com',
  'shutterstock.com',
  'gettyimages.com',
  'istockphoto.com',
  'stock.adobe.com',
];

const MIN_SHORT_EDGE = 1024;
const MIN_ASPECT = 0.75;
const MAX_ASPECT = 1.78;
const VISION_MIN = 1;
const VISION_MAX = 5;

export interface ImageHeuristicsInput {
  width: number;
  height: number;
  sourceUrl: string;
  visionScore: number | null;
}

export interface ImageScoreResult {
  score: number;
  reasons: FailureReason[];
}

/**
 * Pure scoring over already-known dimensions + vision rating.
 * Caller resolves the URL to dimensions + vision result via {@link scoreImage}.
 */
export function scoreImageHeuristics(
  input: ImageHeuristicsInput,
): ImageScoreResult {
  const reasons: FailureReason[] = [];

  if (!input.sourceUrl || input.sourceUrl.length === 0) {
    return {
      score: 0,
      reasons: [{ axis: 'image', code: 'image_unreachable' }],
    };
  }

  if (input.visionScore !== null) {
    if (input.visionScore < VISION_MIN || input.visionScore > VISION_MAX) {
      throw new Error(
        `imageQualityScorer: visionScore ${input.visionScore} out of range [${VISION_MIN}, ${VISION_MAX}]`,
      );
    }
  }

  const shortEdge = Math.min(input.width, input.height);
  if (shortEdge < MIN_SHORT_EDGE) {
    reasons.push({
      axis: 'image',
      code: 'low_resolution',
      detail: `${input.width}×${input.height}`,
    });
  }

  if (input.width > 0 && input.height > 0) {
    const aspect = input.width / input.height;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
      reasons.push({
        axis: 'image',
        code: 'bad_aspect_ratio',
        detail: aspect.toFixed(2),
      });
    }
  }

  const isStock = STOCK_PHOTO_HOSTS.some((host) =>
    input.sourceUrl.toLowerCase().includes(host),
  );
  if (isStock) {
    reasons.push({ axis: 'image', code: 'stock_photo_host' });
  }

  // Vision is the cap. Heuristic penalties stack on top, but a strong
  // vision rating alone never floors below the vision rating itself when
  // there are no penalties.
  let score = input.visionScore ?? 3;

  // Each penalty knocks 1 point off, floored at 0.
  const penalties = reasons.length;
  score = Math.max(0, score - penalties);

  return { score, reasons };
}

export interface ScoreImageDeps {
  headFetch: (url: string) => Promise<{ width: number; height: number }>;
  visionRate: (url: string) => Promise<number>;
}

/**
 * Async wrapper: fetches HEAD-derived dimensions + asks Vision to rate
 * the image, then composes via {@link scoreImageHeuristics}.
 * Deps are injectable for testing — production callers wire real impls.
 */
export async function scoreImage(
  url: string,
  deps: ScoreImageDeps,
): Promise<ImageScoreResult> {
  if (!url) {
    return scoreImageHeuristics({
      width: 0,
      height: 0,
      sourceUrl: '',
      visionScore: null,
    });
  }
  let dims: { width: number; height: number };
  try {
    dims = await deps.headFetch(url);
  } catch {
    return {
      score: 0,
      reasons: [{ axis: 'image', code: 'image_unreachable' }],
    };
  }
  let visionScore: number | null = null;
  try {
    visionScore = await deps.visionRate(url);
  } catch {
    // Vision API failure is non-fatal — fall back to heuristics-only score.
  }
  return scoreImageHeuristics({
    width: dims.width,
    height: dims.height,
    sourceUrl: url,
    visionScore,
  });
}

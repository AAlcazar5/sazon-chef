// ROADMAP 4.0 TB2.2 — /api/tonight/proposal controller.
//
// retrieve → rank-with-LLM → respond. Confidence threshold 0.6 — below
// it the endpoint returns 503 { reason: 'low_confidence' } and the
// Tonight UI shows the "want me to ask Sazon for ideas instead?" path.
// Daily budget overflow falls back to the pure-retrieval top pick.

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { getUserId } from '../../utils/authHelper';
import { resolveRetrievalCandidates } from '../../services/recommender/homeFeedRetrievalAdapter';
import {
  rankWithLLM,
  RankCandidate,
  UserContext,
} from '../../services/recommender/recommenderService';
import { consumeBudget } from '../../services/recommender/recommenderRateLimitService';

const CONFIDENCE_THRESHOLD = 0.6;
const TOP_K = 25;

function timeOfDay(d: Date): string {
  const h = d.getUTCHours();
  if (h < 11) return 'morning';
  if (h < 15) return 'midday';
  if (h < 21) return 'evening';
  return 'late night';
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

async function buildUserContext(userId: string, now: Date): Promise<UserContext> {
  const [prefs, recentCooks] = await Promise.all([
    prisma.userPreferences.findFirst({
      where: { userId },
      include: {
        dietaryRestrictions: true,
        bannedIngredients: true,
      },
    } as any) as Promise<any>,
    (prisma as any).cookingLog?.findMany?.({
      where: { userId },
      orderBy: { cookedAt: 'desc' },
      take: 5,
      include: { recipe: { select: { title: true } } },
    }) ?? Promise.resolve([]),
  ]);

  const cooks = (recentCooks as Array<{
    recipe: { title: string } | null;
    cookedAt: Date;
  }>) ?? [];
  const lastCookAt = cooks[0]?.cookedAt ?? null;
  const daysSinceCook = lastCookAt
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(lastCookAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 999;

  const dietary = (prefs?.dietaryRestrictions ?? []).map((d: any) => d.name);

  return {
    tasteSummary: 'lifestyle eater, varied cuisines',
    lastCooks: cooks.map((c) => c.recipe?.title ?? '').filter(Boolean),
    dietary,
    pantrySummary: '',
    timeOfDay: timeOfDay(now),
    dayOfWeek: DAYS[now.getUTCDay()],
    daysSinceCook,
    expiringItems: [],
  };
}

export const tonightController = {
  async proposal(req: Request, res: Response) {
    let userId: string;
    try {
      userId = getUserId(req);
    } catch {
      return res.status(401).json({ reason: 'unauthenticated' });
    }
    const now = new Date();

    const retrieval = await resolveRetrievalCandidates({
      userId,
      enabled: true,
      k: TOP_K,
    });
    if (!retrieval || retrieval.recipeIds.length === 0) {
      return res.status(503).json({ reason: 'cold_start' });
    }

    const recipes = (await prisma.recipe.findMany({
      where: { id: { in: retrieval.recipeIds } },
      select: {
        id: true,
        title: true,
        cuisine: true,
        cookTime: true,
      } as any,
    } as any)) as Array<{
      id: string;
      title: string;
      cuisine: string;
      cookTime: number;
    }>;

    const scoreById = new Map(
      retrieval.recipeIds.map((id, i) => [id, retrieval.scores[i] ?? 0]),
    );
    const candidates: RankCandidate[] = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      cuisine: r.cuisine,
      cookTime: r.cookTime,
      retrievalScore: scoreById.get(r.id) ?? 0,
    }));
    if (candidates.length === 0) {
      return res.status(503).json({ reason: 'cold_start' });
    }

    const budget = await consumeBudget(userId, now);
    if (!budget.allowed) {
      const top = candidates.sort(
        (a, b) => b.retrievalScore - a.retrievalScore,
      )[0];
      logger.info({ userId }, 'TB2.3 daily budget exceeded; degraded fallback');
      return res.status(200).json({
        recipeId: top.id,
        confidence: 0.5,
        reason: 'Best match from your recent cooking pattern.',
        runnerUpIds: [],
        source: 'retrieval_fallback',
        degraded: 'daily_budget',
      });
    }

    const userContext = await buildUserContext(userId, now);

    let pick;
    try {
      pick = await rankWithLLM({
        userContext,
        candidates,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
      });
    } catch (err) {
      logger.warn({ err, userId }, 'TB2.2 ranker threw');
      return res.status(503).json({ reason: 'ranker_unavailable' });
    }

    if (!pick) {
      return res.status(503).json({ reason: 'low_confidence' });
    }

    return res.status(200).json(pick);
  },
};

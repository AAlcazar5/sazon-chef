import { logger } from '../utils/logger';
// Group 10Y Phase 6 (10Y-C): Sunday-9am weekly check-in job for Pro users.
//
// Builds a personalized weekly summary, asks one open question (Sonnet, with
// deterministic fallback), creates a CoachConversation + assistant message,
// pushes a notification deep-linked to the conversation, and stamps
// lastWeeklyCheckinAt for idempotency. Per-user iteration is wrapped in
// try/catch so a single user's failure never poisons the batch.

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import {
  COACH_MODELS,
  getAnthropicClient,
  resolveCoachTier,
} from '@/services/coachService';
import { generateConversationTitle } from '@/services/coachPromptService';
import { pushNotificationService } from '@/services/pushNotificationService';

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const QUESTION_MAX_TOKENS = 200;

export interface RunOnceResult {
  usersTouched: number;
  pushesSent: number;
}

interface CandidateUser {
  id: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  lastWeeklyCheckinAt: Date | null;
  preferences: { weeklyCheckinOptIn: boolean } | null;
}

interface WeeklySummary {
  caloriesActual: number;
  caloriesGoal: number | null;
  cuisineVariety: string;
  newRecipesTried: number;
  // Header line shown as the push body and the first sentence of the message.
  stem: string;
}

function isStaleEnough(lastCheckin: Date | null, now: Date): boolean {
  if (!lastCheckin) return true;
  return now.getTime() - lastCheckin.getTime() >= SIX_DAYS_MS;
}

interface MealHistoryRow {
  recipeId: string;
  date: Date;
  recipe: {
    cuisine: string | null;
    calories: number | null;
  } | null;
}

async function buildWeeklySummary(
  userId: string,
  now: Date,
): Promise<WeeklySummary> {
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 2 * SEVEN_DAYS_MS);

  const [macroGoals, last7Cooks, prior7Cooks] = await Promise.all([
    prisma.macroGoals.findUnique({ where: { userId } }),
    prisma.mealHistory.findMany({
      where: { userId, date: { gte: sevenDaysAgo, lt: now } },
      include: { recipe: { select: { cuisine: true, calories: true } } },
    }) as Promise<MealHistoryRow[]>,
    prisma.mealHistory.findMany({
      where: { userId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      select: { recipeId: true },
    }),
  ]);

  const caloriesActual = last7Cooks.reduce(
    (sum, h) => sum + (h.recipe?.calories ?? 0),
    0,
  );
  const caloriesGoal = macroGoals ? macroGoals.calories * 7 : null;

  const cuisinesSet = new Set<string>();
  for (const h of last7Cooks) {
    const c = h.recipe?.cuisine?.trim();
    if (c) cuisinesSet.add(c);
  }
  const cuisineVariety = cuisinesSet.size > 0 ? Array.from(cuisinesSet).sort().join(', ') : '—';

  const priorIds = new Set(prior7Cooks.map((c) => c.recipeId));
  const newRecipeIds = new Set<string>();
  for (const h of last7Cooks) {
    if (!priorIds.has(h.recipeId)) newRecipeIds.add(h.recipeId);
  }

  const goalLine =
    caloriesGoal !== null
      ? `${caloriesActual} kcal vs ${caloriesGoal} kcal goal`
      : `${caloriesActual} kcal logged`;
  const stem = `This week: ${goalLine}, ${cuisinesSet.size} cuisine${cuisinesSet.size === 1 ? '' : 's'}, ${newRecipeIds.size} new recipe${newRecipeIds.size === 1 ? '' : 's'}.`;

  return {
    caloriesActual,
    caloriesGoal,
    cuisineVariety,
    newRecipesTried: newRecipeIds.size,
    stem,
  };
}

const QUESTION_SYSTEM_PROMPT = `You are Sazon Coach. Read the user's weekly summary and write ONE warm, open-ended question (under 25 words) that invites reflection. No preamble, no greeting — just the question. End with "?".`;

function templateQuestion(summary: WeeklySummary): string {
  if (summary.newRecipesTried === 0) {
    return 'Want to try something new this week, or stick with what worked?';
  }
  return 'How did this week feel — anything you want to tune for next week?';
}

function extractQuestionText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return '';
  return block.text.trim();
}

async function generateOpenQuestion(summary: WeeklySummary): Promise<string> {
  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch {
    return templateQuestion(summary);
  }

  try {
    const reply = await client.messages.create({
      model: COACH_MODELS.free,
      max_tokens: QUESTION_MAX_TOKENS,
      system: QUESTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: summary.stem }],
    });
    const text = extractQuestionText(reply);
    if (!text || !text.includes('?')) return templateQuestion(summary);
    return text;
  } catch {
    return templateQuestion(summary);
  }
}

interface ProcessedUserOutcome {
  pushed: boolean;
}

async function processUser(
  user: CandidateUser,
  now: Date,
): Promise<ProcessedUserOutcome> {
  // Defense in depth — even if the Prisma where-clause was bypassed, never
  // serve a free user a Pro feature.
  if (resolveCoachTier(user) !== 'premium') {
    return { pushed: false };
  }
  if (!user.preferences?.weeklyCheckinOptIn) {
    return { pushed: false };
  }
  if (!isStaleEnough(user.lastWeeklyCheckinAt, now)) {
    return { pushed: false };
  }

  const summary = await buildWeeklySummary(user.id, now);
  const question = await generateOpenQuestion(summary);
  const content = `${summary.stem}\n\n${question}`;

  const title = generateConversationTitle({
    firstMessage: summary.stem,
    goalPhase: 'maintain',
    topCuisine: null,
    deficientNutrient: null,
  });

  const conversation = await prisma.coachConversation.create({
    data: { userId: user.id, title, tier: 'premium' },
  });

  await prisma.coachMessage.create({
    data: {
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      content,
      modelUsed: COACH_MODELS.free,
      promptTokens: 0,
      completionTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  });

  await pushNotificationService.sendToUser(user.id, {
    title: 'Hey — quick check-in?',
    body: summary.stem,
    data: { screen: 'coach', conversationId: conversation.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastWeeklyCheckinAt: now },
  });

  return { pushed: true };
}

export async function runOnce(now: Date): Promise<RunOnceResult> {
  const candidates = (await prisma.user.findMany({
    where: {
      subscriptionTier: 'premium',
      subscriptionStatus: { in: ['active', 'trialing'] },
      preferences: { is: { weeklyCheckinOptIn: true } },
    },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      lastWeeklyCheckinAt: true,
      preferences: { select: { weeklyCheckinOptIn: true } },
    },
  })) as CandidateUser[];

  let usersTouched = 0;
  let pushesSent = 0;

  for (const user of candidates) {
    try {
      const outcome = await processUser(user, now);
      if (outcome.pushed) {
        usersTouched += 1;
        pushesSent += 1;
      }
    } catch (error) {
      // Per-user error must never poison the batch.
      logger.error(
        { err: error, userId: user.id },
        'coachWeeklyCheckinJob.user.failed',
      );
    }
  }

  return { usersTouched, pushesSent };
}

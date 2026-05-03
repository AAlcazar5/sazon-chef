// Group 10Y-A: Sazon Coach routes — conversation CRUD + SSE streaming endpoint.

import { Router, Request, Response } from 'express';
import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import {
  buildProfileSnapshot,
  buildSystemPrompt,
  generateConversationTitle,
  type CoachProfileInput,
  type GoalPhase,
} from '@/services/coachPromptService';
import {
  buildAnthropicCreateParams,
  getAnthropicClient,
  type CoachTier,
} from '@/services/coachService';

const FREE_DAILY_MESSAGE_CAP = 10;

function resolveTier(subscriptionTier: string | null | undefined): CoachTier {
  return subscriptionTier === 'premium' ? 'premium' : 'free';
}

function resolveGoalPhase(fitnessGoal: string | null | undefined): GoalPhase {
  switch (fitnessGoal) {
    case 'lose_weight':
      return 'cut';
    case 'gain_muscle':
    case 'gain_weight':
      return 'bulk';
    case 'recomp':
      return 'recomp';
    default:
      return 'maintain';
  }
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

async function buildCoachProfile(userId: string): Promise<CoachProfileInput> {
  // Minimal personalization stack — full N=1 wiring lands in a sibling task.
  const macroGoals = await prisma.macroGoals.findUnique({ where: { userId } });
  const physical = await prisma.userPhysicalProfile.findUnique({
    where: { userId },
  });
  return {
    userId,
    pantry: [],
    leftoverInventory: [],
    slotAffinity: [],
    pairAffinity: [],
    remainingMacros: macroGoals
      ? {
          calories: macroGoals.calories,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fat: macroGoals.fat,
          fiber: macroGoals.fiber ?? null,
        }
      : null,
    last7Cooks: [],
    dietaryProfile: [],
    allergens: [],
    cuisineAffinity: [],
    skillTier: 'beginner',
    goalPhase: resolveGoalPhase(physical?.fitnessGoal),
    currentMealPlanDay: null,
  };
}

export const coachRoutes = Router();

coachRoutes.post('/conversations', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const firstMessage = String(req.body?.firstMessage ?? '');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tier = resolveTier(user?.subscriptionTier);

  const profile = await buildCoachProfile(userId);
  const title = generateConversationTitle({
    firstMessage,
    goalPhase: profile.goalPhase,
    topCuisine: profile.cuisineAffinity[0]?.cuisine ?? null,
    deficientNutrient: null,
  });

  const conversation = await prisma.coachConversation.create({
    data: { userId, title, tier },
  });

  res.status(200).json({
    id: conversation.id,
    title: conversation.title,
    tier: conversation.tier,
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
  });
});

coachRoutes.get('/conversations', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const conversations = await prisma.coachConversation.findMany({
    where: { userId },
    orderBy: { lastMessageAt: 'desc' },
  });
  res.status(200).json(conversations);
});

coachRoutes.get(
  '/conversations/:id',
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const conversation = await prisma.coachConversation.findFirst({
      where: { id, userId },
    });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const messages = await prisma.coachMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json({ ...conversation, messages });
  },
);

coachRoutes.post('/message', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const conversationId = String(req.body?.conversationId ?? '');
  const message = String(req.body?.message ?? '');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tier = resolveTier(user?.subscriptionTier);

  if (tier === 'free') {
    const todaysCount = await prisma.coachMessage.count({
      where: {
        userId,
        role: 'user',
        createdAt: { gte: startOfTodayUTC() },
      },
    });
    if (todaysCount >= FREE_DAILY_MESSAGE_CAP) {
      res.status(402).json({
        error: 'COACH_DAILY_CAP',
        paywall: {
          headline: "You're on a roll — Pro Coach has no limits.",
          cta: 'Upgrade to Pro',
        },
      });
      return;
    }
  }

  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  await prisma.coachMessage.create({
    data: { conversationId, userId, role: 'user', content: message },
  });

  const profile = await buildCoachProfile(userId);
  const snapshot = buildProfileSnapshot(profile);
  const systemPrompt = buildSystemPrompt(snapshot);

  const params = buildAnthropicCreateParams({
    tier,
    systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  const anthropic = getAnthropicClient();
  const stream = anthropic.messages.stream(params);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  for await (const event of stream as AsyncIterable<Anthropic.RawMessageStreamEvent>) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      res.write(`data: ${event.delta.text}\n\n`);
    }
  }

  const final = await stream.finalMessage();
  const assistantText = final.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  await prisma.coachMessage.create({
    data: {
      conversationId,
      userId,
      role: 'assistant',
      content: assistantText,
      modelUsed: final.model,
      promptTokens: final.usage.input_tokens,
      completionTokens: final.usage.output_tokens,
      cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: final.usage.cache_creation_input_tokens ?? 0,
    },
  });

  await prisma.coachConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  res.write('event: done\ndata: {}\n\n');
  res.end();
});

// Group 10Y-A + Phase 3: Sazon Coach routes — conversation CRUD + SSE streaming
// with Anthropic tool-use loop (read-only personalized tools).

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
import {
  coachToolDefinitions,
  runCoachTool,
} from '@/services/coachTools';
import { coachContextRoutes } from './coachContextRoutes';

const FREE_DAILY_MESSAGE_CAP = 10;
const MAX_TOOL_USE_ITERATIONS = 5;

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

// Mount the lightweight context endpoint as a sub-route.
coachRoutes.use(coachContextRoutes);

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

interface RecordedToolUse {
  name: string;
  input: unknown;
  result: unknown;
  toolUseId: string;
}

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

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const anthropic = getAnthropicClient();
  const toolUses: RecordedToolUse[] = [];
  const conversationMessages: Anthropic.MessageParam[] = [
    { role: 'user', content: message },
  ];

  let assistantText = '';
  let lastModel = '';
  let totalUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };

  for (let iter = 0; iter < MAX_TOOL_USE_ITERATIONS; iter += 1) {
    const params = buildAnthropicCreateParams({
      tier,
      systemPrompt,
      messages: conversationMessages,
      tools: coachToolDefinitions,
    });
    const stream = anthropic.messages.stream(params);

    const pendingToolUses: Array<{ id: string; name: string; input: unknown }> = [];

    for await (const event of stream as AsyncIterable<Anthropic.RawMessageStreamEvent>) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        assistantText += event.delta.text;
        res.write(`data: ${event.delta.text}\n\n`);
      } else if (
        event.type === 'content_block_start' &&
        event.content_block.type === 'tool_use'
      ) {
        const block = event.content_block;
        pendingToolUses.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
        res.write(
          `event: tool_use\ndata: ${JSON.stringify({
            name: block.name,
            input: block.input,
            toolUseId: block.id,
          })}\n\n`,
        );
      }
    }

    const final = await stream.finalMessage();
    lastModel = final.model;
    totalUsage = {
      input_tokens: totalUsage.input_tokens + (final.usage.input_tokens ?? 0),
      output_tokens: totalUsage.output_tokens + (final.usage.output_tokens ?? 0),
      cache_read_input_tokens:
        totalUsage.cache_read_input_tokens +
        (final.usage.cache_read_input_tokens ?? 0),
      cache_creation_input_tokens:
        totalUsage.cache_creation_input_tokens +
        (final.usage.cache_creation_input_tokens ?? 0),
    };

    if (pendingToolUses.length === 0) {
      break;
    }

    // Echo assistant turn (text + tool_use blocks) into conversation history.
    conversationMessages.push({
      role: 'assistant',
      content: final.content as Anthropic.ContentBlock[],
    });

    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of pendingToolUses) {
      let toolResult: unknown;
      try {
        const { result } = await runCoachTool({
          userId,
          name: tu.name,
          input: tu.input,
          tier,
        });
        toolResult = result;
      } catch (err) {
        toolResult = {
          error: err instanceof Error ? err.message : 'tool_error',
        };
      }
      toolUses.push({
        name: tu.name,
        input: tu.input,
        result: toolResult,
        toolUseId: tu.id,
      });
      res.write(
        `event: tool_result\ndata: ${JSON.stringify({
          toolUseId: tu.id,
          result: toolResult,
        })}\n\n`,
      );
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(toolResult),
      });
    }

    conversationMessages.push({
      role: 'user',
      content: toolResultBlocks,
    });
  }

  await prisma.coachMessage.create({
    data: {
      conversationId,
      userId,
      role: 'assistant',
      content: assistantText,
      attachments: JSON.stringify({ toolUses }),
      modelUsed: lastModel,
      promptTokens: totalUsage.input_tokens,
      completionTokens: totalUsage.output_tokens,
      cacheReadTokens: totalUsage.cache_read_input_tokens,
      cacheWriteTokens: totalUsage.cache_creation_input_tokens,
    },
  });

  await prisma.coachConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  res.write('event: done\ndata: {}\n\n');
  res.end();
});

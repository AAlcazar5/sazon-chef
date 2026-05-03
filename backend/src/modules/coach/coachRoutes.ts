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
  COACH_MODELS,
  getAnthropicClient,
  resolveCoachTier,
} from '@/services/coachService';
import {
  getMedicalDeflectionText,
  sanitizeUserContent,
  shouldDeflectMedicalClaim,
  tagToolResult,
} from '@/services/coachSafetyService';
import {
  COST_CEILING_NOTICE_TEXT,
  selectModelWithBudget,
} from '@/services/coachCostCeilingService';
import {
  coachToolDefinitions,
  runCoachTool,
} from '@/services/coachTools';
import { COACH_PAYWALL_COPY, requireCoachPro } from '@/middleware/requireCoachPro';
import { emit as emitAnalytics } from '@/services/coachAnalytics';
import {
  identifyPantryFromImage,
  CoachVisionError,
  SUPPORTED_VISION_MEDIA_TYPES,
  type VisionMediaType,
} from '@/services/coachVisionService';
import { coachContextRoutes } from './coachContextRoutes';
import { coachMemoryRoutes } from './coachMemoryRoutes';
import {
  enqueueExtraction,
  topMemoriesForUser,
} from '@/services/coachMemoryService';

const FREE_DAILY_MESSAGE_CAP = 10;
const MAX_TOOL_USE_ITERATIONS = 5;
// Phase 5: photo attachments. Wire-level cap per image; the server rejects
// payloads above this with INVALID_ATTACHMENTS. Base64 inflates raw bytes ~33%,
// so 2MB encoded ≈ 1.5MB original — comfortably above iOS HEIC compressed at
// quality 0.7 for typical fridge photos.
const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_ATTACHMENT_BASE64_BYTES = 2 * 1024 * 1024;
const SUPPORTED_ATTACHMENT_TYPE = 'image_base64';

interface RawAttachment {
  type?: unknown;
  mediaType?: unknown;
  data?: unknown;
}

interface ValidatedAttachment {
  type: 'image_base64';
  mediaType: VisionMediaType;
  data: string;
  sizeBytes: number;
}

function validateAttachments(
  raw: unknown[],
): { ok: true; attachments: ValidatedAttachment[] } | { ok: false; reason: string } {
  if (raw.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return { ok: false, reason: 'too_many' };
  }
  const out: ValidatedAttachment[] = [];
  for (const item of raw) {
    const a = item as RawAttachment;
    if (a.type !== SUPPORTED_ATTACHMENT_TYPE) {
      return { ok: false, reason: 'unsupported_type' };
    }
    if (typeof a.mediaType !== 'string' || !SUPPORTED_VISION_MEDIA_TYPES.has(a.mediaType as VisionMediaType)) {
      return { ok: false, reason: 'unsupported_media' };
    }
    if (typeof a.data !== 'string' || a.data.length === 0) {
      return { ok: false, reason: 'missing_data' };
    }
    if (a.data.length > MAX_ATTACHMENT_BASE64_BYTES) {
      return { ok: false, reason: 'too_large' };
    }
    out.push({
      type: 'image_base64',
      mediaType: a.mediaType as VisionMediaType,
      data: a.data,
      sizeBytes: a.data.length,
    });
  }
  return { ok: true, attachments: out };
}

function sanitizeForPersistence(
  attachments: ValidatedAttachment[],
): Array<{ type: 'image_base64'; mediaType: VisionMediaType; sizeBytes: number }> {
  // TODO Phase 8+: migrate base64 to S3/Supabase blob storage and persist URLs here.
  return attachments.map((a) => ({
    type: a.type,
    mediaType: a.mediaType,
    sizeBytes: a.sizeBytes,
  }));
}

function buildUserMessageContent(
  text: string,
  attachments: ValidatedAttachment[],
): Anthropic.ContentBlockParam[] {
  const imageBlocks: Anthropic.ImageBlockParam[] = attachments.map((a) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: a.mediaType,
      data: a.data,
    },
  }));
  return [...imageBlocks, { type: 'text', text }];
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
// Phase 6: Pro-only memory CRUD.
coachRoutes.use('/memories', coachMemoryRoutes);

coachRoutes.post('/conversations', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const firstMessage = String(req.body?.firstMessage ?? '');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tier = resolveCoachTier(user);

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

// Phase 8 (10Y-E): Pro-only Markdown export of a full conversation.
coachRoutes.get(
  '/conversations/:id/export',
  requireCoachPro('export'),
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
    const md = formatConversationMarkdown({
      title: conversation.title,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
    res.status(200);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(md);
  },
);

interface ExportableMessage {
  role: string;
  content: string;
  createdAt: Date;
}

function formatConversationMarkdown(input: {
  title: string;
  messages: ExportableMessage[];
}): string {
  const header = `# ${input.title}`;
  const body = input.messages
    .map((m) => {
      const role = m.role === 'user' ? 'You' : 'Sazon Coach';
      const ts =
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : new Date(m.createdAt).toISOString();
      return `## ${role} · ${ts}\n\n${m.content}`;
    })
    .join('\n\n');
  return `${header}\n\n${body}\n`;
}

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
  const rawAttachments = Array.isArray(req.body?.attachments)
    ? (req.body.attachments as unknown[])
    : [];

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tier = resolveCoachTier(user);

  // Pro-only: photo attachments. Reject free tier with the Coach paywall payload.
  if (rawAttachments.length > 0 && tier !== 'premium') {
    emitAnalytics('coach_paywall_view', {
      userId,
      feature: 'attachments',
      source: 'message_route',
    });
    res.status(403).json({
      error: 'PRO_FEATURE',
      feature: 'attachments',
      paywall: COACH_PAYWALL_COPY.attachments,
    });
    return;
  }

  // Phase 5: validate attachment shape + cap count + cap size before any DB or
  // Anthropic call. Free tier never reaches here (paywall short-circuited above).
  let validated: ValidatedAttachment[] = [];
  if (rawAttachments.length > 0) {
    const result = validateAttachments(rawAttachments);
    if (!result.ok) {
      res.status(400).json({
        error: 'INVALID_ATTACHMENTS',
        reason: result.reason,
        maxCount: MAX_ATTACHMENTS_PER_MESSAGE,
        maxBase64Bytes: MAX_ATTACHMENT_BASE64_BYTES,
      });
      return;
    }
    validated = result.attachments;
  }

  if (tier === 'free') {
    const todaysCount = await prisma.coachMessage.count({
      where: {
        userId,
        role: 'user',
        createdAt: { gte: startOfTodayUTC() },
      },
    });
    if (todaysCount >= FREE_DAILY_MESSAGE_CAP) {
      emitAnalytics('coach_cap_hit', { userId, count: todaysCount });
      emitAnalytics('coach_paywall_view', {
        userId,
        feature: 'daily_cap',
        source: 'message_route',
      });
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

  // Persist sanitized attachment record on the user message (no raw base64).
  const userAttachmentsJson =
    validated.length > 0
      ? JSON.stringify({ attachments: sanitizeForPersistence(validated) })
      : '[]';
  await prisma.coachMessage.create({
    data: {
      conversationId,
      userId,
      role: 'user',
      content: message,
      attachments: userAttachmentsJson,
    },
  });

  // Phase 8: medical-claim deflection runs BEFORE any SDK call. We persist a
  // deterministic assistant message and stream it as SSE — guarantees a stable
  // refusal pattern across the corpus.
  if (shouldDeflectMedicalClaim(message)) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const deflection = getMedicalDeflectionText();
    res.write(`event: medical_deflection\ndata: ${JSON.stringify({ reason: 'medical_claim' })}\n\n`);
    res.write(`data: ${deflection}\n\n`);

    await prisma.coachMessage.create({
      data: {
        conversationId,
        userId,
        role: 'assistant',
        content: deflection,
        attachments: JSON.stringify({ deflected: 'medical_claim' }),
      },
    });
    await prisma.coachConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    emitAnalytics('coach_medical_deflection', { userId, conversationId });
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  const profile = await buildCoachProfile(userId);
  const snapshot = buildProfileSnapshot(profile);
  // Phase 6: Pro users get long-term memories injected into the system prompt.
  // Free users get the same prompt as Phase 5 (no memory section).
  let memoriesForPrompt: Array<{ kind: string; content: string; confidence: number }> = [];
  if (tier === 'premium') {
    try {
      const top = await topMemoriesForUser(userId, 20);
      memoriesForPrompt = top.map((m) => ({
        kind: m.kind,
        content: m.content,
        confidence: m.confidence,
      }));
    } catch {
      memoriesForPrompt = [];
    }
  }
  const systemPrompt = buildSystemPrompt(snapshot, {
    memories: memoriesForPrompt.length > 0 ? memoriesForPrompt : undefined,
  });

  // Phase 8: Pro cost ceiling. If a Pro user has crossed today's budget on
  // either input or output tokens, downgrade their model to Sonnet for this
  // turn and emit a one-time soft notice via SSE.
  let effectiveTier = tier;
  let costNotice: string | null = null;
  if (tier === 'premium') {
    const budgetCheck = await selectModelWithBudget({
      userId,
      defaultModel: COACH_MODELS.premium,
    });
    if (budgetCheck.overBudget) {
      effectiveTier = 'free';
      costNotice = budgetCheck.notice;
      emitAnalytics('coach_cost_ceiling', {
        userId,
        inputUsage: budgetCheck.usage.input,
        outputUsage: budgetCheck.usage.output,
      });
    }
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (costNotice) {
    res.write(`event: cost_notice\ndata: ${JSON.stringify({ message: costNotice })}\n\n`);
  }

  const anthropic = getAnthropicClient();
  const toolUses: RecordedToolUse[] = [];
  const sanitizedMessage = sanitizeUserContent(message);
  const userContent =
    validated.length > 0
      ? buildUserMessageContent(sanitizedMessage, validated)
      : sanitizedMessage;
  const conversationMessages: Anthropic.MessageParam[] = [
    { role: 'user', content: userContent },
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
      tier: effectiveTier,
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
      const taggedResult = tagToolResult(toolResult);
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(taggedResult),
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

  emitAnalytics('coach_message_sent', {
    userId,
    conversationId,
    tier,
    model: lastModel,
    promptTokens: totalUsage.input_tokens,
    completionTokens: totalUsage.output_tokens,
    cacheReadTokens: totalUsage.cache_read_input_tokens,
    cacheWriteTokens: totalUsage.cache_creation_input_tokens,
  });
  if (tier === 'premium') {
    emitAnalytics('coach_pro_message_sent', {
      userId,
      conversationId,
      model: lastModel,
    });
  }

  // Phase 6: Pro-only — kick off async memory extraction over the recent
  // turns. Non-blocking; never throws back into the response stream.
  if (tier === 'premium') {
    enqueueExtraction(userId, conversationId, [
      { role: 'user', content: message },
      { role: 'assistant', content: assistantText },
    ]);
  }

  res.write('event: done\ndata: {}\n\n');
  res.end();
});

// Phase 5: Pro-only — identify food ingredients in a photo for pantry write-back.
// The frontend confirms the picks via UI, then writes via the existing pantry
// bulk-add endpoint. The model-side `add_pantry_items` tool is deferred to Phase 7.
coachRoutes.post(
  '/extract-pantry-from-image',
  requireCoachPro('attachments'),
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const imageBase64 = req.body?.imageBase64;
    const mediaType = req.body?.mediaType;

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      res.status(400).json({ error: 'INVALID_IMAGE' });
      return;
    }
    if (imageBase64.length > MAX_ATTACHMENT_BASE64_BYTES) {
      res.status(400).json({
        error: 'INVALID_ATTACHMENTS',
        reason: 'too_large',
        maxBase64Bytes: MAX_ATTACHMENT_BASE64_BYTES,
      });
      return;
    }
    if (
      typeof mediaType !== 'string' ||
      !SUPPORTED_VISION_MEDIA_TYPES.has(mediaType as VisionMediaType)
    ) {
      res.status(400).json({ error: 'INVALID_MEDIA_TYPE' });
      return;
    }

    try {
      const result = await identifyPantryFromImage({
        imageBase64,
        mediaType: mediaType as VisionMediaType,
      });
      emitAnalytics('coach_pantry_extract', {
        userId,
        count: result.ingredients.length,
      });
      res.status(200).json(result);
    } catch (err) {
      const code =
        err instanceof CoachVisionError ? err.code : 'provider_error';
      const status = code === 'invalid_response' || code === 'refusal' ? 422 : 502;
      res.status(status).json({
        error: 'VISION_FAILED',
        code,
      });
    }
  },
);

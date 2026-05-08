// Group 10Y-A + Phase 3: Sazon Coach routes — conversation CRUD + SSE streaming
// with Anthropic tool-use loop (read-only personalized tools).

import { Router, Request, Response } from 'express';
import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import {
  buildProfileSnapshot,
  buildSystemPromptParts,
  generateConversationTitle,
  type CoachProfileInput,
} from '@/services/coachPromptService';
import {
  buildAnthropicCreateParams,
  COACH_MODELS,
  getAnthropicClient,
  resolveCoachTier,
  type CoachIntent,
} from '@/services/coachService';
import { classifyCoachIntent } from '@/services/coachIntentClassifier';
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
  buildCoachProfileSnapshot,
} from '@/services/coachTools';
import { COACH_PAYWALL_COPY, requireCoachPro } from '@/middleware/requireCoachPro';
import { coachMessageLimiter } from '@/middleware/rateLimiter';
import { emit as emitAnalytics } from '@/services/coachAnalytics';
import { recordTurnCacheUsage } from '@/services/coachCacheHealth';
import { loadConversationHistory } from '@/services/coachHistoryService';
import { selectLLMClient } from '@/services/llm';
import { resolveLocaleForRequest } from '@/utils/coachLocaleResolver';
import {
  anthropicMessagesToNormalized,
  anthropicToolsToNormalized,
  normalizedToAnthropicContent,
} from '@/services/llm/anthropicAdapter';
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

// S17c — free daily cap bumped from 10 → 50. With S17 prompt caching + S17b
// lean dynamic block, per-message cost on free tier is ~$0.0008 once warmed.
// 50 messages/day per free user = ~$0.04/day worst case. Generous tier;
// realistic usage will land far below the cap.
const FREE_DAILY_MESSAGE_CAP = 50;
const MAX_TOOL_USE_ITERATIONS = 5;
const MAX_MESSAGE_CHARS = 4000;
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

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// Wraps the shared snapshot loader so existing call sites keep their import.
// The snapshot lives in coachTools.ts so the read-only tools and the system
// prompt builder share one source of truth — N=1 personalization signal.
async function buildCoachProfile(userId: string): Promise<CoachProfileInput> {
  return buildCoachProfileSnapshot(userId);
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

// Per-user concurrent-stream guard. A single Coach message can spawn up to
// MAX_TOOL_USE_ITERATIONS sequential Anthropic calls; allowing multiple
// concurrent streams per user lets one user exhaust server resources and
// also opens a TOCTOU race on the daily-budget check (two streams both read
// "under budget", both run a full Opus turn, daily cap is bypassed).
// One in-flight stream per user closes both holes.
const inFlightCoachStreams = new Map<string, number>();
const MAX_CONCURRENT_STREAMS_PER_USER = 1;

function ensureSingleCoachStream(req: Request, res: Response, next: () => void): void {
  let userId: string;
  try {
    userId = getUserId(req);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const current = inFlightCoachStreams.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_STREAMS_PER_USER) {
    res.status(429).json({
      error: 'COACH_BUSY',
      message: 'A previous Coach message is still streaming. Wait for it to finish.',
    });
    return;
  }
  inFlightCoachStreams.set(userId, current + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const after = (inFlightCoachStreams.get(userId) ?? 1) - 1;
    if (after <= 0) {
      inFlightCoachStreams.delete(userId);
    } else {
      inFlightCoachStreams.set(userId, after);
    }
  };
  res.on('close', release);
  res.on('finish', release);
  next();
}

coachRoutes.post('/message', coachMessageLimiter, ensureSingleCoachStream, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const conversationId = String(req.body?.conversationId ?? '');
  const message = String(req.body?.message ?? '');
  const rawAttachments = Array.isArray(req.body?.attachments)
    ? (req.body.attachments as unknown[])
    : [];

  if (message.length > MAX_MESSAGE_CHARS) {
    res.status(400).json({
      error: 'MESSAGE_TOO_LONG',
      max: MAX_MESSAGE_CHARS,
      received: message.length,
    });
    return;
  }

  // Sanitize once and reuse for every downstream consumer (DB persist,
  // Anthropic call, memory extractor). The raw `message` is only used for
  // the medical-claim regex below — sanitization can mask obfuscated
  // claims and weaken that detector.
  const sanitizedMessage = sanitizeUserContent(message);

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

  // Tier $$ — $$1.1 + $$1.2: load prior turns BEFORE persisting the new user
  // message so the loaded history excludes the message we're about to send.
  // Service caps to MAX_HISTORY_TURNS, marks the cached prefix with
  // cache_control, and prepends a synthetic summary if the budget overflowed.
  const priorHistory = await loadConversationHistory({ conversationId }).catch(
    () => ({ messages: [] as Anthropic.MessageParam[], summarized: false }),
  );

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
      content: sanitizedMessage,
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
  // i18n — resolve the user's locale (User.locale → Accept-Language → 'en').
  // Auto-detect: if User.locale is null and the device sends a Spanish
  // Accept-Language header, persist the detected locale on the row so
  // subsequent turns skip header parsing. Fire-and-forget — the resolver
  // swallows write failures so a flaky DB never blocks a coach turn.
  const acceptLanguage = req.headers['accept-language'] as string | undefined;
  const locale = await resolveLocaleForRequest({
    userId,
    acceptLanguageHeader: acceptLanguage,
    readUserLocale: async (uid) => {
      const u = (await prisma.user.findUnique({
        where: { id: uid },
        select: { locale: true },
      })) as { locale: string | null } | null;
      return u?.locale ?? null;
    },
    readUserCoachLocale: async (uid) => {
      const u = (await prisma.user.findUnique({
        where: { id: uid },
        select: { coachLocale: true },
      })) as { coachLocale: string | null } | null;
      return u?.coachLocale ?? null;
    },
    onAutoDetected: async (uid, detected) => {
      await prisma.user.update({
        where: { id: uid },
        data: { locale: detected },
      });
    },
  });

  // S17 — split system prompt for prompt caching. The persona is byte-stable
  // across calls (cache_control: ephemeral), the profile + memories blob is
  // per-call and stays uncached so we don't churn the cache on every turn.
  const systemBlocks = buildSystemPromptParts(snapshot, {
    memories: memoriesForPrompt.length > 0 ? memoriesForPrompt : undefined,
    locale,
  });

  // Tier S: classify the user's message intent for routing between Sonnet
  // (chat) and Opus (deep_plan). Free tier ignores intent — always Haiku.
  const intent: CoachIntent = classifyCoachIntent(sanitizedMessage);

  // Phase 8 + Tier S S7: Pro cost ceiling. Per-user daily token budget; when
  // crossed we downgrade the model for this turn and emit a one-time notice.
  let effectiveTier = tier;
  let modelOverride: string | undefined;
  let costNotice: string | null = null;
  if (tier === 'premium') {
    const defaultModel =
      intent === 'deep_plan' ? COACH_MODELS.premiumDeepPlan : COACH_MODELS.premium;
    const budgetCheck = await selectModelWithBudget({
      userId,
      defaultModel,
      tier,
    });
    if (budgetCheck.overBudget) {
      effectiveTier = 'free';
      modelOverride = COACH_MODELS.free;
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

  // Code#1: wrap the entire SSE flow so any uncaught error emits an `error`
  // event and ends the stream cleanly instead of dropping the socket mid-turn.
  try {
    if (costNotice) {
      res.write(`event: cost_notice\ndata: ${JSON.stringify({ message: costNotice })}\n\n`);
    }

    // Tier $$ — $$2.2: tier-aware LLM client. Premium → Anthropic always.
    // Free → Anthropic by default; flips to OpenRouter (Gemini Flash) when
    // COACH_FREE_PROVIDER=openrouter-gemini.
    const llmClient = selectLLMClient(effectiveTier);
    const toolUses: RecordedToolUse[] = [];
    const userContent =
      validated.length > 0
        ? buildUserMessageContent(sanitizedMessage, validated)
        : sanitizedMessage;
    // $$1.1 — prepend prior turns. The cached prefix has cache_control on its
    // last block; the live tail (last 2 turns) stays uncached. New user
    // message goes at the end and is never cached (always fresh input).
    const conversationMessages: Anthropic.MessageParam[] = [
      ...priorHistory.messages,
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
      // Tier $$ — $$3.2: inner-loop output cap. The first iteration always
      // gets the full max_tokens (the model may answer directly without
      // tool use). Subsequent iterations are post-tool-execution re-calls;
      // those are usually short ("calling next tool…" or final answer). We
      // still leave the LAST possible iteration uncapped so the model has
      // headroom for a final answer. Net: caps iterations 1..MAX-2.
      const innerToolIteration =
        iter > 0 && iter < MAX_TOOL_USE_ITERATIONS - 1;
      const handle = llmClient.startStream({
        tier: effectiveTier,
        systemBlocks,
        messages: anthropicMessagesToNormalized(conversationMessages),
        tools: anthropicToolsToNormalized(coachToolDefinitions),
        intent,
        modelOverride,
        innerToolIteration,
      });

      // Capture the IDs/names from the stream for early SSE echo.
      // `input` is empty during streaming and arrives populated on
      // `finalMessage().content`. We re-attach inputs after the stream ends.
      const pendingToolUses: Array<{ id: string; name: string; input: unknown }> = [];

      for await (const event of handle.events) {
        if (event.type === 'text_delta') {
          assistantText += event.text;
          res.write(`data: ${event.text}\n\n`);
        } else if (event.type === 'tool_use_start') {
          pendingToolUses.push({
            id: event.id,
            name: event.name,
            input: {},
          });
          // Early echo — IDs/names are reliable; input filled in below.
          res.write(
            `event: tool_use\ndata: ${JSON.stringify({
              name: event.name,
              input: {},
              toolUseId: event.id,
              partial: true,
            })}\n\n`,
          );
        }
      }

      const final = await handle.finalMessage();
      lastModel = final.model;
      totalUsage = {
        input_tokens: totalUsage.input_tokens + final.usage.inputTokens,
        output_tokens: totalUsage.output_tokens + final.usage.outputTokens,
        cache_read_input_tokens:
          totalUsage.cache_read_input_tokens + final.usage.cacheReadTokens,
        cache_creation_input_tokens:
          totalUsage.cache_creation_input_tokens + final.usage.cacheWriteTokens,
      };

      // Populate tool_use inputs from the final assembled message. The
      // tool_use_start event arrives without `input` populated (matches
      // Anthropic streaming spec); inputs come on finalMessage().
      const pendingById = new Map(pendingToolUses.map((p) => [p.id, p]));
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue;
        const pending = pendingById.get(block.id);
        if (pending) {
          pending.input = block.input;
        } else {
          pendingToolUses.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      if (pendingToolUses.length === 0) {
        break;
      }

      // Re-broadcast tool_use with populated input so the frontend sees the
      // real args (and our DB log records them too).
      for (const tu of pendingToolUses) {
        res.write(
          `event: tool_use\ndata: ${JSON.stringify({
            name: tu.name,
            input: tu.input,
            toolUseId: tu.id,
          })}\n\n`,
        );
      }

      // Echo assistant turn (text + tool_use blocks) into conversation history.
      conversationMessages.push({
        role: 'assistant',
        content: normalizedToAnthropicContent(
          final.content,
        ) as Anthropic.ContentBlock[],
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
    // Tier $$ — $$5.1: track cache health per conversation. Warns once when
    // 3+ consecutive turns show cacheReadTokens=0 (silent S17 regression).
    recordTurnCacheUsage({
      conversationId,
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
        { role: 'user', content: sanitizedMessage },
        { role: 'assistant', content: assistantText },
      ]);
    }

    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (err) {
    // Code#1: SSE-aware error path. Headers are already flushed at this point,
    // so we cannot send an HTTP error; emit an SSE `error` event and end.
    emitAnalytics('coach_stream_error', {
      userId,
      conversationId,
      message: err instanceof Error ? err.message : 'unknown',
    });
    if (!res.writableEnded) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ code: 'INTERNAL' })}\n\n`);
      } catch {
        // socket already closed — nothing to do
      }
      res.end();
    }
  }
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

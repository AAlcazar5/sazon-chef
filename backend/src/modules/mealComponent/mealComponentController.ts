// backend/src/modules/mealComponent/mealComponentController.ts
// Group 10X Phase 1+2+5 — Build-a-Plate API surface.

import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId, isAuthenticated } from '../../utils/authHelper';
import {
  listComponents,
  saveComposedPlate,
  generatePermutations,
  getPlateFromPantry,
  computePantryCoverage,
  COMPONENT_SLOTS,
  type ComponentSlot,
} from '../../services/mealComponentService';
import { solveCookTimeline, ComponentTask } from '../../services/cookTimelineService';
import { getTopComponentsForSlot, recordAffinityEvent } from '../../services/slotAffinityService';
import { fitPlateToMacros } from '../../services/macroAutoFitService';
import {
  addLeftoversFromPlate,
  consumeLeftoversForPlate,
  getActiveLeftovers,
} from '../../services/leftoverInventoryService';
import { composePlateFromUtterance } from '../../services/utteranceComposerService';
import {
  buildFamilyMeal,
  divergeFromSharedBase,
  persistFamilyMeal,
  type FamilyPlateInput,
} from '../../services/familyMealService';
import {
  listHouseholdMembers,
  createHouseholdMember,
  updateHouseholdMember,
  deleteHouseholdMember,
  type AgeBand,
} from '../../services/householdRosterService';
import {
  createShareLink,
  getPlateBySlug,
  getPlateOfTheWeek,
  savePlateForUser,
} from '../../services/plateShareService';
import { getUserSkillTier, visibleSlotsForTier } from '../../services/skillTierService';
import { generatePlateVariations } from '../../services/composedPlateVariationService';
import {
  listVariantsForComponent,
  getCompatibleVariants,
} from '../../services/mealComponentVariantService';
import {
  computeNutrientGap,
  TARGET_DAILY_NUTRIENTS,
  type TrackedNutrient,
} from '../../services/nutrientGapService';
import { computeWeeklyPlateSummary } from '../../services/recentPlatesService';
import { prisma } from '../../lib/prisma';

const slotEnum = z.enum(['protein', 'base', 'vegetable', 'sauce', 'garnish']);

const listQuerySchema = z.object({
  slot: slotEnum.optional(),
  dietary: z.string().min(1).max(64).optional(),
  cuisine: z.string().min(1).max(64).optional(),
  q: z.string().min(1).max(128).optional(),
});

const componentSelectionSchema = z.object({
  slot: slotEnum,
  componentId: z.string().min(1).max(128),
  portionMultiplier: z.number().positive().max(10),
});

const createPlateSchema = z.object({
  components: z.array(componentSelectionSchema).min(1).max(10),
  name: z.string().min(1).max(120).optional(),
  saveAsRecipe: z.boolean().optional().default(false),
});

const lockedSlotSchema = z.object({
  slot: slotEnum,
  componentId: z.string().min(1).max(128),
});

const permutationsBodySchema = z.object({
  lockedSlots: z.array(lockedSlotSchema).max(5),
  slotsToFill: z.array(slotEnum).min(1).max(5),
  maxResults: z.number().int().min(1).max(20),
  prioritizePantry: z.boolean(),
});

const lockedSlotWithMultiplierSchema = z.object({
  slot: slotEnum,
  componentId: z.string().min(1).max(128),
  portionMultiplier: z.number().positive().max(10),
});

const autoFitBodySchema = z.object({
  target: z.object({
    calories: z.number().positive(),
    protein: z.number().nonnegative(),
  }),
  lockedSlots: z.array(lockedSlotWithMultiplierSchema).max(5),
  slotsToFill: z.array(slotEnum).max(5),
});

const leftoverInputSchema = z.object({
  componentId: z.string().min(1).max(128),
  slot: slotEnum,
  portionsRemaining: z.number().positive().max(20),
});

const markCookedBodySchema = z.object({
  leftovers: z.array(leftoverInputSchema).max(10).optional().default([]),
  consumePlateComponents: z
    .array(z.object({ componentId: z.string().min(1).max(128), portionMultiplier: z.number().positive().max(10) }))
    .max(10)
    .optional()
    .default([]),
});

const utteranceBodySchema = z.object({
  utterance: z.string().min(1).max(500),
});

const familyPlateComponentSchema = z.object({
  componentId: z.string().min(1).max(128),
  portionMultiplier: z.number().positive().max(10),
  slot: slotEnum,
});

const familyMealBodySchema = z.object({
  plates: z
    .array(
      z.object({
        plateId: z.string().min(1).max(64),
        components: z.array(familyPlateComponentSchema).min(1).max(10),
        householdMemberId: z.string().min(1).max(128).optional(),
      })
    )
    .min(1)
    .max(6),
  name: z.string().min(1).max(120).optional(),
  persist: z.boolean().optional().default(false),
});

const divergeBodySchema = z.object({
  sharedSlots: z
    .array(z.object({ slot: slotEnum, componentId: z.string().min(1).max(128) }))
    .min(1)
    .max(5),
  perPlateDivergentSlots: z
    .array(
      z.object({
        plateId: z.string().min(1).max(64),
        slots: z
          .array(z.object({ slot: slotEnum, componentId: z.string().min(1).max(128) }))
          .min(1)
          .max(5),
      })
    )
    .min(1)
    .max(6),
});

const ageBandEnum = z.enum(['toddler', 'kid', 'teen', 'adult', 'elder']);

const householdMemberBodySchema = z.object({
  displayName: z.string().min(1).max(64),
  ageBand: ageBandEnum,
  pickinessLevel: z.number().int().min(0).max(4).optional(),
  dietaryFlags: z.array(z.string().min(1).max(64)).max(20).optional(),
  bannedComponentIds: z.array(z.string().min(1).max(128)).max(100).optional(),
});

const householdMemberPatchSchema = householdMemberBodySchema.partial();

const formatZodIssues = (error: z.ZodError): string =>
  Array.isArray((error as any).issues)
    ? (error as any).issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
    : error.message;

export const mealComponentController = {
  async permutations(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = permutationsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }

    try {
      const userId = getUserId(req);
      const permutationsList = await generatePermutations({ userId, ...parsed.data });
      return res.json({ permutations: permutationsList });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (message.startsWith('Locked component not found')) {
        return res.status(400).json({ error: message });
      }
      console.error('Error generating permutations:', error);
      return res.status(500).json({ error: 'Failed to generate permutations' });
    }
  },

  async plateFromPantry(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userId = getUserId(req);
      const plate = await getPlateFromPantry({ userId });
      return res.json({ plate });
    } catch (error) {
      console.error('Error fetching plate from pantry:', error);
      return res.status(500).json({ error: 'Failed to fetch plate from pantry' });
    }
  },


  async list(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: formatZodIssues(parsed.error),
      });
    }

    try {
      const userId = getUserId(req);
      const components = await listComponents({ userId, ...parsed.data });
      return res.json({ components });
    } catch (error) {
      console.error('Error listing meal components:', error);
      return res.status(500).json({ error: 'Failed to list meal components' });
    }
  },

  async createPlate(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = createPlateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }

    try {
      const userId = getUserId(req);
      const result = await saveComposedPlate({
        userId,
        components: parsed.data.components,
        name: parsed.data.name,
        saveAsRecipe: parsed.data.saveAsRecipe,
      });
      return res.status(201).json({ plate: result.plate, recipe: result.recipe });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (/component not found|at least one component/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error creating composed plate:', error);
      return res.status(500).json({ error: 'Failed to save composed plate' });
    }
  },

  async plateTimeline(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const plateId = req.params.id;
    const userId = getUserId(req);

    try {
      const plate = await prisma.composedPlate.findFirst({
        where: { id: plateId, userId },
      });

      if (!plate) {
        return res.status(404).json({ error: 'Plate not found' });
      }

      let componentEntries: Array<{ slot: string; componentId: string; portionMultiplier: number }> = [];
      try {
        componentEntries = JSON.parse(plate.componentIds);
      } catch {
        return res.status(500).json({ error: 'Failed to compute cook timeline' });
      }

      const componentIds = componentEntries.map((e) => e.componentId);
      const rows = await prisma.mealComponent.findMany({
        where: {
          id: { in: componentIds },
          OR: [{ userId: null }, { userId }],
        },
      });

      const byId = new Map(rows.map((r) => [r.id, r] as const));

      const safeJsonArray = (raw: string): string[] => {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          return [];
        }
      };

      const tasks: ComponentTask[] = componentEntries
        .filter((e) => byId.has(e.componentId))
        .map((e) => {
          const row = byId.get(e.componentId)!;
          return {
            componentId: row.id,
            name: row.name,
            slot: e.slot as ComponentTask['slot'],
            cookTimeMinutes: row.cookTimeMinutes ?? 0,
            cookMethodHint: row.cookMethodHint,
            equipmentNeeded: safeJsonArray(row.equipmentNeeded ?? '[]'),
          };
        });

      const timeline = solveCookTimeline(tasks);
      return res.json({ timeline });
    } catch (error) {
      console.error('Error computing cook timeline:', error);
      return res.status(500).json({ error: 'Failed to compute cook timeline' });
    }
  },

  async slotAffinity(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const slot = req.query.slot as string | undefined;
    if (!slot || !COMPONENT_SLOTS.includes(slot as ComponentSlot)) {
      return res.status(400).json({
        error: `slot query param is required and must be one of: ${COMPONENT_SLOTS.join(', ')}`,
      });
    }

    const parsedLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(50, parsedLimit)
      : 20;

    try {
      const userId = getUserId(req);
      const favorites = await getTopComponentsForSlot(userId, slot as ComponentSlot, limit);
      return res.json({ slot, favorites });
    } catch (error) {
      console.error('Error fetching slot affinity:', error);
      return res.status(500).json({ error: 'Failed to fetch slot affinity' });
    }
  },

  async swapAway(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const componentId = req.params.id;
    if (!componentId || componentId.length > 128) {
      return res.status(400).json({ error: 'Invalid component id' });
    }
    try {
      const userId = getUserId(req);
      await recordAffinityEvent({ type: 'swap_away', userId, componentId });
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error recording swap_away:', error);
      return res.status(500).json({ error: 'Failed to record swap event' });
    }
  },

  async autoFit(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = autoFitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }

    try {
      const userId = getUserId(req);
      const result = await fitPlateToMacros({
        userId,
        target: parsed.data.target,
        lockedSlots: parsed.data.lockedSlots,
        slotsToFill: parsed.data.slotsToFill,
      });
      return res.json({ result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/not found or not owned/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error running macro auto-fit:', error);
      return res.status(500).json({ error: 'Failed to compute macro auto-fit' });
    }
  },

  async listLeftovers(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const userId = getUserId(req);
      const leftovers = await getActiveLeftovers(userId);
      return res.json({ leftovers });
    } catch (error) {
      console.error('Error listing leftovers:', error);
      return res.status(500).json({ error: 'Failed to list leftovers' });
    }
  },

  async plateVariations(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const plateId = req.params.id;
    if (!plateId || plateId.length > 128) {
      return res.status(400).json({ error: 'Invalid plate id' });
    }
    const rawCount = req.query.count;
    const parsedCount = typeof rawCount === 'string' ? Number(rawCount) : 3;
    const count = Number.isFinite(parsedCount) ? parsedCount : 3;

    try {
      const userId = getUserId(req);
      const variations = await generatePlateVariations({ plateId, userId, count });
      return res.json({ variations });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/forbidden|not found/i.test(message)) {
        return res.status(404).json({ error: message });
      }
      console.error('Error generating plate variations:', error);
      return res.status(500).json({ error: 'Failed to generate plate variations' });
    }
  },

  async getSkillTier(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const userId = getUserId(req);
      const tier = await getUserSkillTier(userId);
      const visibleSlots = visibleSlotsForTier(tier);
      return res.json({ tier, visibleSlots });
    } catch (error) {
      console.error('Error fetching skill tier:', error);
      return res.status(500).json({ error: 'Failed to fetch skill tier' });
    }
  },

  async listComponentVariants(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const componentId = req.params.id;
    if (!componentId || componentId.length > 128) {
      return res.status(400).json({ error: 'Invalid component id' });
    }
    try {
      const lockedRaw = req.query.lockedSlots;
      const lockedSlots: { slot: string; componentId: string }[] = [];
      const MAX_LOCKED_QUERY_LEN = 512;
      const MAX_LOCKED_PAIRS = 5;
      if (
        typeof lockedRaw === 'string' &&
        lockedRaw.length > 0 &&
        lockedRaw.length <= MAX_LOCKED_QUERY_LEN
      ) {
        for (const pair of lockedRaw.split(',')) {
          if (lockedSlots.length >= MAX_LOCKED_PAIRS) break;
          const [slot, cid] = pair.split(':');
          if (slot && cid && slot.length <= 32 && cid.length <= 128) {
            lockedSlots.push({ slot, componentId: cid });
          }
        }
      }
      const variants = lockedSlots.length
        ? (await getCompatibleVariants(componentId, lockedSlots)).map((v) => ({
            id: v.variant.id,
            variantKey: v.variant.variantKey,
            label: v.variant.displayName,
            compatibilityScore: v.compatibilityScore,
            caloriesDeltaPerPortion: v.variant.caloriePerPortionDelta,
            cookTimeMinutes: v.variant.cookTimeMinutes,
          }))
        : (await listVariantsForComponent(componentId)).map((v) => ({
            id: v.id,
            variantKey: v.variantKey,
            label: v.displayName,
            compatibilityScore: 0.5,
            caloriesDeltaPerPortion: v.caloriePerPortionDelta,
            cookTimeMinutes: v.cookTimeMinutes,
          }));
      return res.json({ variants });
    } catch (error) {
      console.error('Error fetching component variants:', error);
      return res.status(500).json({ error: 'Failed to fetch component variants' });
    }
  },

  async getWeeklyPlateSummary(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const userId = getUserId(req);
      const summary = await computeWeeklyPlateSummary(userId);
      return res.json(summary);
    } catch (error) {
      console.error('Error fetching weekly plate summary:', error);
      return res.status(500).json({ error: 'Failed to fetch weekly plate summary' });
    }
  },

  async getNutrientGapTop(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const userId = getUserId(req);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todaysCooks = await prisma.cookingLog.findMany({
        where: { userId, cookedAt: { gte: startOfToday } },
        include: { recipe: { select: { fiber: true } } },
      });

      const fiberG = todaysCooks.reduce(
        (sum, log) => sum + (log.recipe?.fiber ?? 0),
        0,
      );

      const result = computeNutrientGap({ fiberG });
      return res.json({
        topGap: result.topGap,
        pctRemainingByNutrient: result.pctRemainingByNutrient,
        targets: TARGET_DAILY_NUTRIENTS,
      });
    } catch (error) {
      console.error('Error fetching nutrient gap:', error);
      return res.status(500).json({ error: 'Failed to fetch nutrient gap' });
    }
  },

  async sharePlate(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const plateId = req.params.id;
    if (!plateId || plateId.length > 128) {
      return res.status(400).json({ error: 'Invalid plate id' });
    }
    try {
      const userId = getUserId(req);
      const link = await createShareLink({ userId, plateId });
      return res.status(201).json({ share: link });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/not found|forbidden/i.test(message)) {
        return res.status(404).json({ error: message });
      }
      console.error('Error creating share link:', error);
      return res.status(500).json({ error: 'Failed to create share link' });
    }
  },

  async getSharedPlate(req: Request, res: Response) {
    const slug = req.params.slug;
    if (!slug || slug.length > 64) {
      return res.status(400).json({ error: 'Invalid slug' });
    }
    try {
      const result = await getPlateBySlug(slug);
      if (!result) return res.status(404).json({ error: 'Plate not found' });
      return res.json({ share: result });
    } catch (error) {
      console.error('Error fetching shared plate:', error);
      return res.status(500).json({ error: 'Failed to fetch shared plate' });
    }
  },

  async getSharedPlateSubCount(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const slug = req.params.slug;
    if (!slug || slug.length > 64) {
      return res.status(400).json({ error: 'Invalid slug' });
    }
    try {
      const userId = getUserId(req);
      const result = await getPlateBySlug(slug);
      if (!result) return res.status(404).json({ error: 'Plate not found' });
      const plate = result.plate as { componentIds?: string } | null;
      if (!plate?.componentIds) return res.json({ subsCount: 0 });

      let parsed: { componentId: string }[] = [];
      try {
        const arr = JSON.parse(plate.componentIds);
        if (Array.isArray(arr)) parsed = arr;
      } catch {
        return res.json({ subsCount: 0 });
      }
      if (parsed.length === 0) return res.json({ subsCount: 0 });

      const componentIds = parsed
        .map((c) => c?.componentId)
        .filter((id): id is string => typeof id === 'string');

      const [components, pantryItems] = await Promise.all([
        prisma.mealComponent.findMany({
          where: { id: { in: componentIds } },
          select: { id: true, pantryIngredientNames: true },
        }),
        prisma.pantryItem.findMany({ where: { userId } }),
      ]);

      const pantryNames = pantryItems.map((p) => p.name);
      const compsById = new Map(components.map((c) => [c.id, c]));
      const subsCount = componentIds.reduce((count, id) => {
        const comp = compsById.get(id);
        if (!comp) return count + 1;
        let ingredients: string[] = [];
        try {
          const arr = JSON.parse(comp.pantryIngredientNames);
          if (Array.isArray(arr)) ingredients = arr.filter((s): s is string => typeof s === 'string');
        } catch {
          /* fall through */
        }
        if (ingredients.length === 0) return count;
        const coverage = computePantryCoverage(ingredients, pantryNames);
        return coverage === 0 ? count + 1 : count;
      }, 0);

      return res.json({ subsCount });
    } catch (error) {
      console.error('Error computing shared plate sub count:', error);
      return res.status(500).json({ error: 'Failed to compute substitution count' });
    }
  },

  async plateOfTheWeek(req: Request, res: Response) {
    try {
      // Optional auth — when present, ranking is personalized to viewer's
      // pantry + cuisine prefs + dietary safety. Anonymous viewers get the
      // global top plate (legacy behavior).
      const viewerUserId = isAuthenticated(req) ? getUserId(req) : undefined;
      const top = await getPlateOfTheWeek(viewerUserId);
      return res.json({ plate: top });
    } catch (error) {
      console.error('Error fetching plate-of-the-week:', error);
      return res.status(500).json({ error: 'Failed to fetch plate-of-the-week' });
    }
  },

  async savePlate(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const plateId = req.params.id;
    if (!plateId || plateId.length > 128) {
      return res.status(400).json({ error: 'Invalid plate id' });
    }
    try {
      const userId = getUserId(req);
      await savePlateForUser({ userId, plateId });
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error saving plate:', error);
      return res.status(500).json({ error: 'Failed to save plate' });
    }
  },

  async fromUtterance(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const parsed = utteranceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }
    try {
      const userId = getUserId(req);
      const result = await composePlateFromUtterance({ userId, utterance: parsed.data.utterance });
      return res.json({ result });
    } catch (error) {
      console.error('Error composing from utterance:', error);
      return res.status(500).json({ error: 'Failed to compose from utterance' });
    }
  },

  async createFamilyMeal(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const parsed = familyMealBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }
    try {
      const userId = getUserId(req);
      const familyMeal = buildFamilyMeal({
        userId,
        plates: parsed.data.plates as FamilyPlateInput[],
      });

      // When persist=true, write to ComposedFamilyMeal + join rows so the
      // composer can re-open the family meal later and the cook timeline can
      // read the merged steps without recomputing.
      if (parsed.data.persist) {
        const persisted = await persistFamilyMeal({
          userId,
          name: parsed.data.name,
          plates: parsed.data.plates.map((p) => ({
            plateId: p.plateId,
            components: p.components as FamilyPlateInput['components'],
            householdMemberId: p.householdMemberId,
          })),
        });
        return res.status(201).json({ familyMeal, persisted });
      }

      return res.status(201).json({ familyMeal });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/at least one plate|maximum.*plates|forbidden|not found/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error building family meal:', error);
      return res.status(500).json({ error: 'Failed to build family meal' });
    }
  },

  async divergeFromBase(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const parsed = divergeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }
    try {
      const plates = divergeFromSharedBase(parsed.data);
      return res.status(200).json({ plates });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/at least one|at most/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error diverging from base:', error);
      return res.status(500).json({ error: 'Failed to diverge from base' });
    }
  },

  async listHousehold(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const members = await listHouseholdMembers(getUserId(req));
      return res.json({ members });
    } catch (error) {
      console.error('Error listing household:', error);
      return res.status(500).json({ error: 'Failed to list household' });
    }
  },

  async createHouseholdMember(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const parsed = householdMemberBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }
    try {
      const member = await createHouseholdMember(getUserId(req), {
        ...parsed.data,
        ageBand: parsed.data.ageBand as AgeBand,
      });
      return res.status(201).json({ member });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/required|must be/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error creating household member:', error);
      return res.status(500).json({ error: 'Failed to create household member' });
    }
  },

  async updateHouseholdMember(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const memberId = req.params.id;
    if (!memberId || memberId.length > 128) {
      return res.status(400).json({ error: 'Invalid member id' });
    }
    const parsed = householdMemberPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }
    try {
      const member = await updateHouseholdMember(getUserId(req), memberId, {
        ...parsed.data,
        ageBand: parsed.data.ageBand as AgeBand | undefined,
      });
      return res.json({ member });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/forbidden|not found/i.test(message)) {
        return res.status(404).json({ error: message });
      }
      if (/required|must be/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      console.error('Error updating household member:', error);
      return res.status(500).json({ error: 'Failed to update household member' });
    }
  },

  async deleteHouseholdMember(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const memberId = req.params.id;
    if (!memberId || memberId.length > 128) {
      return res.status(400).json({ error: 'Invalid member id' });
    }
    try {
      await deleteHouseholdMember(getUserId(req), memberId);
      return res.status(204).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (/forbidden|not found/i.test(message)) {
        return res.status(404).json({ error: message });
      }
      console.error('Error deleting household member:', error);
      return res.status(500).json({ error: 'Failed to delete household member' });
    }
  },

  async markPlateCooked(req: Request, res: Response) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const plateId = req.params.id;
    if (!plateId || plateId.length > 128) {
      return res.status(400).json({ error: 'Invalid plate id' });
    }
    const parsed = markCookedBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodIssues(parsed.error),
      });
    }

    try {
      const userId = getUserId(req);
      const plate = await prisma.composedPlate.findUnique({ where: { id: plateId } });
      if (!plate || plate.userId !== userId) {
        return res.status(404).json({ error: 'Plate not found' });
      }

      await consumeLeftoversForPlate({
        userId,
        plateComponents: parsed.data.consumePlateComponents,
      });
      await addLeftoversFromPlate({
        userId,
        sourcePlateId: plateId,
        leftovers: parsed.data.leftovers,
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('Error marking plate cooked:', error);
      return res.status(500).json({ error: 'Failed to mark plate cooked' });
    }
  },
};

export const __slotsForTesting = COMPONENT_SLOTS;

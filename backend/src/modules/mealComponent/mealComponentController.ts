// backend/src/modules/mealComponent/mealComponentController.ts
// Group 10X Phase 1+2 — Build-a-Plate API surface.

import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId, isAuthenticated } from '../../utils/authHelper';
import {
  listComponents,
  saveComposedPlate,
  generatePermutations,
  getPlateFromPantry,
  COMPONENT_SLOTS,
} from '../../services/mealComponentService';

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
};

export const __slotsForTesting = COMPONENT_SLOTS;

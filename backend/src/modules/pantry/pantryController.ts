import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../utils/authHelper';
import { logger } from '../../utils/logger';

export const pantryController = {
  /**
   * Get all pantry items for a user
   * GET /api/pantry
   */
  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const items = await prisma.pantryItem.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      });

      res.json(items);
    } catch (error: any) {
      logger.error({ err: error }, 'Error fetching pantry items:');
      res.status(500).json({ error: 'Failed to fetch pantry items' });
    }
  },

  /**
   * Add a single item to pantry
   * POST /api/pantry
   */
  async addItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, category } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const normalizedName = name.toLowerCase().trim();

      const item = await prisma.pantryItem.upsert({
        where: {
          userId_name: { userId, name: normalizedName },
        },
        create: {
          userId,
          name: normalizedName,
          category: category || null,
        },
        update: {
          category: category || undefined,
        },
      });

      res.status(201).json(item);
    } catch (error: any) {
      logger.error({ err: error }, 'Error adding pantry item:');
      res.status(500).json({ error: 'Failed to add pantry item' });
    }
  },

  /**
   * Add multiple items to pantry (bulk)
   * POST /api/pantry/bulk
   */
  async addMany(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required and must not be empty' });
      }

      const results = await Promise.allSettled(
        items.map(async (item: { name: string; category?: string }) => {
          if (!item.name || typeof item.name !== 'string' || !item.name.trim()) return null;

          const normalizedName = item.name.toLowerCase().trim();

          return prisma.pantryItem.upsert({
            where: {
              userId_name: { userId, name: normalizedName },
            },
            create: {
              userId,
              name: normalizedName,
              category: item.category || null,
            },
            update: {
              category: item.category || undefined,
            },
          });
        })
      );

      const created = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value != null)
        .map(r => r.value);

      res.status(201).json({ items: created, count: created.length });
    } catch (error: any) {
      logger.error({ err: error }, 'Error bulk adding pantry items:');
      res.status(500).json({ error: 'Failed to add pantry items' });
    }
  },

  /**
   * Remove a pantry item by ID
   * DELETE /api/pantry/:id
   */
  async removeItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const item = await prisma.pantryItem.findFirst({
        where: { id, userId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Pantry item not found' });
      }

      await prisma.pantryItem.delete({ where: { id } });

      res.json({ message: 'Pantry item removed' });
    } catch (error: any) {
      logger.error({ err: error }, 'Error removing pantry item:');
      res.status(500).json({ error: 'Failed to remove pantry item' });
    }
  },

  /**
   * Consume pantry items by ingredient name.
   * POST /api/pantry/consume
   * Body: { ingredients: string[] }
   * Fuzzy-matches ingredient strings against user's pantry (token containment),
   * deletes matches, returns { consumed, unmatched }.
   */
  async consume(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { ingredients } = req.body;

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Ingredients array is required and must not be empty' });
      }

      const pantryItems = await prisma.pantryItem.findMany({ where: { userId } });
      const consumed: string[] = [];
      const unmatched: string[] = [];
      const toDeleteIds = new Set<string>();

      for (const rawIngredient of ingredients) {
        if (typeof rawIngredient !== 'string' || !rawIngredient.trim()) {
          continue;
        }
        const normalized = rawIngredient.toLowerCase().trim();
        // Try exact match first, then token containment (either direction)
        const match = pantryItems.find((p) => {
          if (toDeleteIds.has(p.id)) return false;
          const pantryName = p.name.toLowerCase();
          if (pantryName === normalized) return true;
          // Token-level: any pantry word appears as a word in ingredient, or vice versa
          const pantryTokens = pantryName.split(/\s+/).filter((t) => t.length > 2);
          const ingTokens = normalized.split(/\s+/).filter((t) => t.length > 2);
          return (
            pantryTokens.some((t) => ingTokens.includes(t)) ||
            ingTokens.some((t) => pantryTokens.includes(t))
          );
        });

        if (match) {
          toDeleteIds.add(match.id);
          consumed.push(rawIngredient);
        } else {
          unmatched.push(rawIngredient);
        }
      }

      if (toDeleteIds.size > 0) {
        await prisma.pantryItem.deleteMany({
          where: { id: { in: Array.from(toDeleteIds) }, userId },
        });
      }

      res.json({ consumed, unmatched });
    } catch (error: any) {
      logger.error({ err: error }, 'Error consuming pantry items:');
      res.status(500).json({ error: 'Failed to consume pantry items' });
    }
  },

  /**
   * Remove a pantry item by name
   * DELETE /api/pantry/by-name/:name
   */
  async removeByName(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const name = decodeURIComponent(req.params.name).toLowerCase().trim();

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const item = await prisma.pantryItem.findUnique({
        where: {
          userId_name: { userId, name },
        },
      });

      if (!item) {
        return res.status(404).json({ error: 'Pantry item not found' });
      }

      await prisma.pantryItem.delete({ where: { id: item.id } });

      res.json({ message: 'Pantry item removed' });
    } catch (error: any) {
      logger.error({ err: error }, 'Error removing pantry item by name:');
      res.status(500).json({ error: 'Failed to remove pantry item' });
    }
  },
};

// backend/src/modules/recipe/recipeCollectionsController.ts
//
// R1-2 split (round 2, 2026-05-04) — extracted collection-management
// handlers out of the 5895-line recipeController.ts. These 9 handlers are
// the most isolated cluster: they all operate on `Collection` and
// `RecipeCollection`, share no state with the recipe-search/scoring path,
// and have a clean test surface.
//
// recipeController.ts re-exports each handler so existing callers and
// tests don't have to change import paths.

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

export const recipeCollectionsController = {
  /** GET /api/recipes/collections */
  async getCollections(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const collections = await (prisma as any).collection.findMany({
        where: { userId },
        orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { recipeCollections: true } } },
      });
      const result = collections.map((c: any) => ({
        ...c,
        recipeCount: c._count?.recipeCollections || 0,
        _count: undefined,
      }));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('❌ Get collections error:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  /** POST /api/recipes/collections */
  async createCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, description, coverImageUrl, category } = req.body as {
        name: string;
        description?: string;
        coverImageUrl?: string;
        category?: string;
      };
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const collection = await (prisma as any).collection.create({
        data: {
          userId,
          name,
          description: description || null,
          coverImageUrl: coverImageUrl || null,
          category: category || null,
          isDefault: false,
        },
      });
      res.json({ success: true, data: collection });
    } catch (error: any) {
      console.error('❌ Create collection error:', error);
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Collection already exists' });
      }
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  /** PUT /api/recipes/collections/:id (partial — only provided fields) */
  async updateCollection(req: Request, res: Response) {
    try {
      const _userId = getUserId(req);
      const { id } = req.params;
      const { name, description, coverImageUrl, isPinned, category } = req.body as {
        name?: string;
        description?: string | null;
        coverImageUrl?: string | null;
        isPinned?: boolean;
        category?: string | null;
      };
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl;
      if (isPinned !== undefined) data.isPinned = isPinned;
      if (category !== undefined) data.category = category;
      const updated = await (prisma as any).collection.update({ where: { id }, data });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('❌ Update collection error:', error);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  /** DELETE /api/recipes/collections/:id (cascades RecipeCollection rows) */
  async deleteCollection(req: Request, res: Response) {
    try {
      const _userId = getUserId(req);
      const { id } = req.params;
      const collection = await (prisma as any).collection.findUnique({ where: { id } });
      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      await (prisma as any).recipeCollection.deleteMany({ where: { collectionId: id } });
      await (prisma as any).collection.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Delete collection error:', error);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  },

  /** PATCH /api/recipes/:id/move-to-collection */
  async moveSavedRecipe(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params; // recipeId
      const { collectionIds } = req.body as { collectionIds: string[] };
      const saved = await prisma.savedRecipe.findFirst({ where: { userId, recipeId: id } });
      if (!saved) return res.status(404).json({ error: 'Saved recipe not found' });

      await (prisma as any).recipeCollection.deleteMany({
        where: { savedRecipeId: saved.id },
      });

      if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0) {
        for (const collectionId of collectionIds) {
          try {
            await (prisma as any).recipeCollection.create({
              data: {
                savedRecipeId: saved.id,
                collectionId,
                addedAt: new Date(),
              },
            });
          } catch (error: any) {
            if (error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Move saved recipe error:', error);
      res.status(500).json({ error: 'Failed to move recipe to collection' });
    }
  },

  /** PATCH /api/recipes/collections/:id/pin */
  async togglePinCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const collection = await (prisma as any).collection.findFirst({ where: { id, userId } });
      if (!collection) return res.status(404).json({ error: 'Collection not found' });
      const updated = await (prisma as any).collection.update({
        where: { id },
        data: { isPinned: !collection.isPinned },
      });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('❌ Toggle pin collection error:', error);
      res.status(500).json({ error: 'Failed to toggle pin' });
    }
  },

  /** PUT /api/recipes/collections/reorder */
  async reorderCollections(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { order } = req.body as { order: { id: string; sortOrder: number }[] };
      if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Order array is required' });
      await Promise.all(
        order.map(({ id, sortOrder }) =>
          (prisma as any).collection.updateMany({ where: { id, userId }, data: { sortOrder } })
        )
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Reorder collections error:', error);
      res.status(500).json({ error: 'Failed to reorder collections' });
    }
  },

  /** POST /api/recipes/collections/:id/duplicate */
  async duplicateCollection(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const source = await (prisma as any).collection.findFirst({
        where: { id, userId },
        include: { recipeCollections: true },
      });
      if (!source) return res.status(404).json({ error: 'Collection not found' });

      const newCollection = await (prisma as any).collection.create({
        data: {
          userId,
          name: `${source.name} (Copy)`,
          description: source.description,
          coverImageUrl: source.coverImageUrl,
          isDefault: false,
        },
      });

      if (source.recipeCollections.length > 0) {
        await (prisma as any).recipeCollection.createMany({
          data: source.recipeCollections.map((rc: any) => ({
            savedRecipeId: rc.savedRecipeId,
            collectionId: newCollection.id,
            addedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      res.json({
        success: true,
        data: { ...newCollection, recipeCount: source.recipeCollections.length },
      });
    } catch (error: any) {
      console.error('❌ Duplicate collection error:', error);
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'A collection with that name already exists' });
      }
      res.status(500).json({ error: 'Failed to duplicate collection' });
    }
  },

  /** POST /api/recipes/collections/merge — moves all source recipes into target */
  async mergeCollections(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { sourceIds, targetId } = req.body as { sourceIds: string[]; targetId: string };
      if (!sourceIds?.length || !targetId) return res.status(400).json({ error: 'sourceIds and targetId are required' });
      if (sourceIds.includes(targetId)) return res.status(400).json({ error: 'Target cannot be a source' });

      const collections = await (prisma as any).collection.findMany({
        where: { id: { in: [...sourceIds, targetId] }, userId },
      });
      if (collections.length !== sourceIds.length + 1) {
        return res.status(404).json({ error: 'One or more collections not found' });
      }

      const sourceAssociations = await (prisma as any).recipeCollection.findMany({
        where: { collectionId: { in: sourceIds } },
      });

      for (const assoc of sourceAssociations) {
        try {
          await (prisma as any).recipeCollection.create({
            data: { savedRecipeId: assoc.savedRecipeId, collectionId: targetId, addedAt: new Date() },
          });
        } catch (e: any) {
          if (e.code !== 'P2002') throw e;
        }
      }

      await (prisma as any).recipeCollection.deleteMany({ where: { collectionId: { in: sourceIds } } });
      await (prisma as any).collection.deleteMany({ where: { id: { in: sourceIds }, userId } });

      const updated = await (prisma as any).collection.findUnique({
        where: { id: targetId },
        include: { _count: { select: { recipeCollections: true } } },
      });
      res.json({
        success: true,
        data: {
          ...updated,
          recipeCount: updated._count?.recipeCollections || 0,
          _count: undefined,
        },
      });
    } catch (error: any) {
      console.error('❌ Merge collections error:', error);
      res.status(500).json({ error: 'Failed to merge collections' });
    }
  },
};

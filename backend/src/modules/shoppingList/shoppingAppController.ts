// backend/src/modules/shoppingList/shoppingAppController.ts
// Controller for 3rd party shopping app integrations

import { Request, Response } from 'express';
import { shoppingAppIntegrationService } from '../../services/shoppingAppIntegrationService';
import { syncShoppingListBidirectional, syncRecipeToShoppingApp } from '../../services/shoppingListSyncService';
import { getUserId } from '../../utils/authHelper';

export const shoppingAppController = {
  /**
   * Get user's shopping app integrations
   * GET /api/shopping-apps/integrations
   */
  async getIntegrations(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const integrations = await shoppingAppIntegrationService.getUserIntegrations(userId);
      res.json(integrations);
    } catch (error: any) {
      console.error('Error getting shopping app integrations:', error);
      res.status(500).json({ error: 'Failed to get shopping app integrations' });
    }
  },

  /**
   * Get supported shopping apps
   * GET /api/shopping-apps/supported
   */
  async getSupportedApps(req: Request, res: Response) {
    try {
      const apps = shoppingAppIntegrationService.getSupportedApps();
      res.json(apps);
    } catch (error: any) {
      console.error('Error getting supported apps:', error);
      res.status(500).json({ error: 'Failed to get supported apps' });
    }
  },

  /**
   * Connect to a shopping app
   * POST /api/shopping-apps/connect
   */
  async connectApp(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { appName, apiKey, accessToken, refreshToken } = req.body;

      if (!appName) {
        return res.status(400).json({ error: 'App name is required' });
      }

      const integration = await shoppingAppIntegrationService.connectApp(userId, appName, {
        apiKey,
        accessToken,
        refreshToken,
      });

      res.status(201).json(integration);
    } catch (error: any) {
      console.error('Error connecting to shopping app:', error);
      res.status(500).json({ error: error.message || 'Failed to connect to shopping app' });
    }
  },

  /**
   * Disconnect from a shopping app
   * DELETE /api/shopping-apps/connect/:appName
   */
  async disconnectApp(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { appName } = req.params;

      await shoppingAppIntegrationService.disconnectApp(userId, appName);
      res.json({ message: `Disconnected from ${appName}` });
    } catch (error: any) {
      console.error('Error disconnecting from shopping app:', error);
      res.status(500).json({ error: 'Failed to disconnect from shopping app' });
    }
  },

  /**
   * Sync shopping list to external app
   * POST /api/shopping-apps/sync/:appName
   */
  async syncToExternalApp(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { appName } = req.params;
      const { shoppingListId } = req.body;

      if (!shoppingListId) {
        return res.status(400).json({ error: 'Shopping list ID is required' });
      }

      // Get shopping list items
      const { prisma } = await import('../../lib/prisma');
      const shoppingList = await prisma.shoppingList.findFirst({
        where: { id: shoppingListId, userId },
        include: {
          items: {
            where: { purchased: false }, // Only sync unpurchased items
          },
        },
      });

      if (!shoppingList) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      // Convert to ShoppingListItem format
      const items = shoppingList.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || undefined,
        notes: item.notes || undefined,
      }));

      // Sync to external app
      const result = await shoppingAppIntegrationService.addItemsToExternalApp(
        userId,
        appName,
        items
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error syncing to external app:', error);
      res.status(500).json({ error: 'Failed to sync to external app' });
    }
  },

  /**
   * Sync shopping list bidirectionally with external app
   * POST /api/shopping-apps/sync-bidirectional/:appName
   */
  async syncBidirectional(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { appName } = req.params;
      const { shoppingListId } = req.body;

      if (!shoppingListId) {
        return res.status(400).json({ error: 'Shopping list ID is required' });
      }

      const result = await syncShoppingListBidirectional(userId, shoppingListId, appName);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error syncing bidirectionally:', error);
      res.status(500).json({ error: 'Failed to sync shopping list' });
    }
  },

  /**
   * Sync recipe ingredients directly to external shopping app
   * POST /api/shopping-apps/sync-recipe/:appName
   */
  async syncRecipe(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { appName } = req.params;
      const { recipeId } = req.body;

      if (!recipeId) {
        return res.status(400).json({ error: 'Recipe ID is required' });
      }

      const result = await syncRecipeToShoppingApp(userId, recipeId, appName);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error syncing recipe to shopping app:', error);
      res.status(500).json({ error: 'Failed to sync recipe to shopping app' });
    }
  },
};


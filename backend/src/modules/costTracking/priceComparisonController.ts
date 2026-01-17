// backend/src/modules/costTracking/priceComparisonController.ts
// Price comparison and savings suggestions endpoints

import { Request, Response } from 'express';
import { getUserId } from '../../utils/authHelper';
import {
  compareIngredientPrices,
  findRecipeSavings,
  compareMultipleIngredients,
  findBestStoreForShoppingList,
} from '../../utils/priceComparison';
import { getUserLocation, findNearbyStores } from '../../services/storeLocationService';
import { prisma } from '../../lib/prisma';

/**
 * Compare prices for a specific ingredient
 * GET /api/cost-tracking/ingredients/:ingredientName/compare
 */
export const compareIngredient = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { ingredientName } = req.params;

    const comparison = await compareIngredientPrices(ingredientName, userId);

    if (!comparison) {
      return res.status(404).json({ error: 'No price data found for this ingredient' });
    }

    res.json(comparison);
  } catch (error: any) {
    console.error('Error comparing ingredient prices:', error);
    res.status(500).json({ error: 'Failed to compare ingredient prices' });
  }
};

/**
 * Find savings opportunities for a recipe
 * GET /api/cost-tracking/recipes/:id/savings
 */
export const getRecipeSavings = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { id } = req.params;

    const savings = await findRecipeSavings(id, userId);

    if (!savings) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(savings);
  } catch (error: any) {
    console.error('Error finding recipe savings:', error);
    res.status(500).json({ error: 'Failed to find recipe savings' });
  }
};

/**
 * Compare prices for multiple ingredients
 * POST /api/cost-tracking/ingredients/compare
 */
export const compareMultiple = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { ingredientNames } = req.body;

    if (!Array.isArray(ingredientNames) || ingredientNames.length === 0) {
      return res.status(400).json({ error: 'ingredientNames array is required' });
    }

    const comparisons = await compareMultipleIngredients(ingredientNames, userId);

    res.json({ comparisons });
  } catch (error: any) {
    console.error('Error comparing multiple ingredients:', error);
    res.status(500).json({ error: 'Failed to compare ingredients' });
  }
};

/**
 * Find best store for a shopping list
 * POST /api/cost-tracking/shopping-list/best-store
 * Body: { ingredientNames: string[], zipCode?: string, latitude?: number, longitude?: number, radiusMiles?: number }
 */
export const getBestStore = async (req: Request, res: Response) => {
  try {
      const userId = getUserId(req);
    const { ingredientNames, zipCode, latitude, longitude, radiusMiles = 10 } = req.body;

    if (!Array.isArray(ingredientNames) || ingredientNames.length === 0) {
      return res.status(400).json({ error: 'ingredientNames array is required' });
    }

    // Check if location services are enabled
    const { isLocationServicesEnabledFromRequest } = require('@/utils/privacyHelper');
    const locationServicesEnabled = isLocationServicesEnabledFromRequest(req);
    
    console.log('🔒 Location services enabled:', locationServicesEnabled);

    // Get user location from request or preferences (only if location services enabled)
    let userLocation = null;
    let nearbyStores: Array<{ store: string; distance: number; address?: string }> | undefined = undefined;

    if (locationServicesEnabled) {
      if (zipCode || (latitude && longitude)) {
        // Get location from request
        userLocation = await getUserLocation(zipCode, latitude, longitude);
      } else {
        // Try to get from user preferences
        const preferences = await prisma.userPreferences.findUnique({
          where: { userId },
        });

        if (preferences) {
          if (preferences.useLocationServices && preferences.latitude && preferences.longitude) {
            userLocation = {
              latitude: preferences.latitude,
              longitude: preferences.longitude,
              zipCode: preferences.zipCode || undefined,
            };
          } else if (preferences.zipCode) {
            userLocation = await getUserLocation(preferences.zipCode);
          }
        }
      }
    } else {
      console.log('🔒 Location services disabled - skipping location-based store recommendations');
    }

    // Find nearby stores if location is available
    if (userLocation) {
      const stores = await findNearbyStores(userLocation, radiusMiles);
      nearbyStores = stores.map(s => ({
        store: s.store,
        distance: s.distance,
        address: s.address,
      }));
    }

    const bestStore = await findBestStoreForShoppingList(ingredientNames, userId, nearbyStores);

    if (!bestStore) {
      return res.status(404).json({ error: 'No price data found for these ingredients' });
    }

    res.json({
      ...bestStore,
      nearbyStores: nearbyStores?.slice(0, 5), // Include top 5 nearby stores in response
    });
  } catch (error: any) {
    console.error('Error finding best store:', error);
    res.status(500).json({ error: 'Failed to find best store' });
  }
};


// backend/src/services/shoppingAppIntegrationService.ts
// Service for integrating with 3rd party shopping apps (Instacart, Walmart, Kroger, etc.)

import { prisma } from '../lib/prisma';
import axios from 'axios';

export interface ShoppingAppConfig {
  appName: string;
  apiBaseUrl: string;
  requiresAuth: boolean;
  authType?: 'oauth2' | 'api_key';
}

export interface ShoppingListItem {
  name: string;
  quantity: string;
  category?: string;
  notes?: string;
}

export interface ShoppingAppResponse {
  success: boolean;
  message?: string;
  externalListId?: string;
  itemsAdded?: number;
}

/**
 * Supported shopping apps configuration
 */
const SHOPPING_APPS: Record<string, ShoppingAppConfig> = {
  instacart: {
    appName: 'Instacart',
    apiBaseUrl: 'https://api.instacart.com',
    requiresAuth: true,
    authType: 'oauth2',
  },
  walmart: {
    appName: 'Walmart',
    apiBaseUrl: 'https://developer.api.walmart.com',
    requiresAuth: true,
    authType: 'api_key',
  },
  kroger: {
    appName: 'Kroger',
    apiBaseUrl: 'https://api.kroger.com',
    requiresAuth: true,
    authType: 'oauth2',
  },
};

export class ShoppingAppIntegrationService {
  /**
   * Get user's shopping app integrations
   */
  async getUserIntegrations(userId: string) {
    return await prisma.shoppingAppIntegration.findMany({
      where: { userId, isActive: true },
    });
  }

  /**
   * Connect to a shopping app
   */
  async connectApp(userId: string, appName: string, credentials: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    const config = SHOPPING_APPS[appName.toLowerCase()];
    if (!config) {
      throw new Error(`Shopping app "${appName}" is not supported`);
    }

    // Create or update integration
    const integration = await prisma.shoppingAppIntegration.upsert({
      where: {
        userId_appName: {
          userId,
          appName: appName.toLowerCase(),
        },
      },
      update: {
        apiKey: credentials.apiKey,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        isActive: true,
      },
      create: {
        userId,
        appName: appName.toLowerCase(),
        apiKey: credentials.apiKey,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        isActive: true,
      },
    });

    return integration;
  }

  /**
   * Disconnect from a shopping app
   */
  async disconnectApp(userId: string, appName: string) {
    return await prisma.shoppingAppIntegration.updateMany({
      where: {
        userId,
        appName: appName.toLowerCase(),
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Add items to external shopping app
   */
  async addItemsToExternalApp(
    userId: string,
    appName: string,
    items: ShoppingListItem[]
  ): Promise<ShoppingAppResponse> {
    const integration = await prisma.shoppingAppIntegration.findUnique({
      where: {
        userId_appName: {
          userId,
          appName: appName.toLowerCase(),
        },
      },
    });

    if (!integration || !integration.isActive) {
      return {
        success: false,
        message: `Not connected to ${appName}. Please connect your account first.`,
      };
    }

    const config = SHOPPING_APPS[appName.toLowerCase()];
    if (!config) {
      return {
        success: false,
        message: `Shopping app "${appName}" is not supported`,
      };
    }

    try {
      // This is a placeholder - actual implementation will depend on each app's API
      const result = await this.syncItemsToApp(appName, integration, items, config);
      return result;
    } catch (error: any) {
      console.error(`Error syncing items to ${appName}:`, error);
      return {
        success: false,
        message: `Failed to sync items to ${appName}: ${error.message}`,
      };
    }
  }

  /**
   * Sync items to specific shopping app
   * This is a placeholder - actual implementation will vary by app
   */
  private async syncItemsToApp(
    appName: string,
    integration: any,
    items: ShoppingListItem[],
    config: ShoppingAppConfig
  ): Promise<ShoppingAppResponse> {
    // Placeholder implementation
    // Real implementation would:
    // 1. Authenticate with the app's API
    // 2. Create or find shopping list
    // 3. Add items to the list
    // 4. Return success/failure

    console.log(`🛒 Syncing ${items.length} items to ${config.appName}...`);
    console.log('Items:', items.map(i => `${i.name} (${i.quantity})`).join(', '));

    // For now, return a mock success response
    // TODO: Implement actual API integration for each shopping app
    return {
      success: true,
      message: `Items added to ${config.appName} shopping list`,
      itemsAdded: items.length,
    };
  }

  /**
   * Get supported shopping apps
   */
  getSupportedApps(): Array<{ name: string; displayName: string; requiresAuth: boolean }> {
    return Object.values(SHOPPING_APPS).map((config) => ({
      name: config.appName.toLowerCase(),
      displayName: config.appName,
      requiresAuth: config.requiresAuth,
    }));
  }
}

export const shoppingAppIntegrationService = new ShoppingAppIntegrationService();


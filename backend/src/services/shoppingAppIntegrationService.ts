import { logger } from '../utils/logger';
// backend/src/services/shoppingAppIntegrationService.ts
// Service for integrating with 3rd party shopping apps (Instacart, Walmart, Kroger, etc.)

import { prisma } from '../lib/prisma';
import axios from 'axios';
import { encrypt, decrypt, isEncrypted } from '../utils/encryption';

// B3: third-party OAuth tokens / API keys are encrypted at rest. Reads
// transparently round-trip via decryptCredentials. Pre-existing rows
// (written before B3) round-trip cleanly because isEncrypted() returns
// false on plaintext and we leave it as-is on read; on the next write the
// upsert encrypts going forward.
function encryptCredential(value: string | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

function decryptCredential(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return isEncrypted(value) ? decrypt(value) : value;
}

interface IntegrationCredentialsRow {
  apiKey?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

function decryptIntegrationCredentials<T extends IntegrationCredentialsRow>(integration: T): T {
  return {
    ...integration,
    apiKey: decryptCredential(integration.apiKey) ?? null,
    accessToken: decryptCredential(integration.accessToken) ?? null,
    refreshToken: decryptCredential(integration.refreshToken) ?? null,
  };
}

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
    const rows = await prisma.shoppingAppIntegration.findMany({
      where: { userId, isActive: true },
    });
    return rows.map(decryptIntegrationCredentials);
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

    // B3: encrypt all three credential fields at rest before persisting.
    const encryptedApiKey = encryptCredential(credentials.apiKey);
    const encryptedAccessToken = encryptCredential(credentials.accessToken);
    const encryptedRefreshToken = encryptCredential(credentials.refreshToken);

    const integration = await prisma.shoppingAppIntegration.upsert({
      where: {
        userId_appName: {
          userId,
          appName: appName.toLowerCase(),
        },
      },
      update: {
        apiKey: encryptedApiKey,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        isActive: true,
      },
      create: {
        userId,
        appName: appName.toLowerCase(),
        apiKey: encryptedApiKey,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        isActive: true,
      },
    });

    // Return decrypted shape so the caller works with plaintext.
    return decryptIntegrationCredentials(integration);
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
    const integrationRow = await prisma.shoppingAppIntegration.findUnique({
      where: {
        userId_appName: {
          userId,
          appName: appName.toLowerCase(),
        },
      },
    });

    if (!integrationRow || !integrationRow.isActive) {
      return {
        success: false,
        message: `Not connected to ${appName}. Please connect your account first.`,
      };
    }

    // B3: decrypt credentials before handing the row to the per-app sync.
    const integration = decryptIntegrationCredentials(integrationRow);

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
      logger.error({ err: error }, `Error syncing items to ${appName}:`);
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

    logger.info(`🛒 Syncing ${items.length} items to ${config.appName}...`);
    logger.info({ items: items.map(i => `${i.name} (${i.quantity})`).join(', ') }, 'shoppingAppIntegration.items');

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


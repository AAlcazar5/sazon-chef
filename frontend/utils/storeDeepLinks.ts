// frontend/utils/storeDeepLinks.ts
// Utility functions to generate deep links for shopping apps

import { Linking, Platform } from 'react-native';

export interface StoreDeepLinkOptions {
  storeName: string;
  items: Array<{ name: string; quantity?: string }>;
  location?: string;
}

/**
 * Store configuration for deep links
 * Each store has platform-specific URL schemes and web URLs
 */
interface StoreConfig {
  /** Display name for the store */
  displayName: string;
  /** iOS app URL scheme */
  iosScheme: string;
  /** Android package name */
  androidPackage: string;
  /** Web URL for search */
  webSearchUrl: (query: string) => string;
  /** Web URL for homepage */
  webHomeUrl: string;
}

/**
 * Centralized store configurations
 * Add new stores by adding entries to this object
 */
const STORE_CONFIGS: Record<string, StoreConfig> = {
  instacart: {
    displayName: 'Instacart',
    iosScheme: 'instacart',
    androidPackage: 'com.instacart.client',
    webSearchUrl: (q) => `https://www.instacart.com/store/search?q=${q}`,
    webHomeUrl: 'https://www.instacart.com/store',
  },
  walmart: {
    displayName: 'Walmart',
    iosScheme: 'walmart',
    androidPackage: 'com.walmart.android',
    webSearchUrl: (q) => `https://www.walmart.com/search?q=${q}`,
    webHomeUrl: 'https://www.walmart.com',
  },
  kroger: {
    displayName: 'Kroger',
    iosScheme: 'kroger',
    androidPackage: 'com.kroger.mobileapp',
    webSearchUrl: (q) => `https://www.kroger.com/search?q=${q}`,
    webHomeUrl: 'https://www.kroger.com',
  },
  target: {
    displayName: 'Target',
    iosScheme: 'target',
    androidPackage: 'com.target.ui',
    webSearchUrl: (q) => `https://www.target.com/s?searchTerm=${q}`,
    webHomeUrl: 'https://www.target.com',
  },
  safeway: {
    displayName: 'Safeway',
    iosScheme: 'safeway',
    androidPackage: 'com.safeway.client.android.safeway',
    webSearchUrl: (q) => `https://www.safeway.com/shop/search-results.html?q=${q}`,
    webHomeUrl: 'https://www.safeway.com',
  },
  'whole foods': {
    displayName: 'Whole Foods',
    iosScheme: 'amazonfresh',
    androidPackage: 'com.amazon.fresh',
    webSearchUrl: (q) => `https://www.amazon.com/alm/storefront?almBrandId=WholeFoods&searchTerm=${q}`,
    webHomeUrl: 'https://www.amazon.com/alm/storefront?almBrandId=WholeFoods',
  },
};

// Alias for "wholefoods" (without space)
STORE_CONFIGS['wholefoods'] = STORE_CONFIGS['whole foods'];

/**
 * Build a deep link URL for a specific platform and store
 */
function buildDeepLink(config: StoreConfig, searchQuery: string, isSearch: boolean): string {
  if (Platform.OS === 'ios') {
    return isSearch
      ? `${config.iosScheme}://search?q=${searchQuery}`
      : `${config.iosScheme}://home`;
  } else if (Platform.OS === 'android') {
    return isSearch
      ? `intent://search?q=${searchQuery}#Intent;scheme=${config.iosScheme};package=${config.androidPackage};end`
      : `intent://home#Intent;scheme=${config.iosScheme};package=${config.androidPackage};end`;
  }

  // Fallback to web URL
  return isSearch ? config.webSearchUrl(searchQuery) : config.webHomeUrl;
}

/**
 * Generate a deep link URL for a shopping app
 * Since most stores don't support adding multiple items via URL,
 * we'll search for the first item or open the store homepage
 */
export function generateStoreDeepLink(options: StoreDeepLinkOptions, searchFirstItem: boolean = true): string | null {
  const { storeName, items } = options;
  const normalizedStore = storeName.toLowerCase().trim();

  // Get the first item for search
  const firstItem = items.length > 0 ? items[0].name : '';
  const searchQuery = encodeURIComponent(firstItem);
  const isSearch = searchFirstItem && !!firstItem;

  // Check if we have a configuration for this store
  const config = STORE_CONFIGS[normalizedStore];
  if (config) {
    return buildDeepLink(config, searchQuery, isSearch);
  }

  // Generic web search fallback for unknown stores
  if (firstItem) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${storeName} ${firstItem}`)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(storeName)}`;
}

/**
 * Get web fallback URL for a store
 */
function getWebFallbackUrl(options: StoreDeepLinkOptions, searchFirstItem: boolean = true): string | null {
  const { storeName, items } = options;
  const normalizedStore = storeName.toLowerCase().trim();
  const firstItem = items.length > 0 ? items[0].name : '';
  const searchQuery = encodeURIComponent(firstItem);
  const isSearch = searchFirstItem && !!firstItem;

  // Check if we have a configuration for this store
  const config = STORE_CONFIGS[normalizedStore];
  if (config) {
    return isSearch ? config.webSearchUrl(searchQuery) : config.webHomeUrl;
  }

  // Generic web search fallback
  if (firstItem) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${storeName} ${firstItem}`)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(storeName)}`;
}

/**
 * Open store app/website with shopping list items
 * @param options Store and items configuration
 * @param searchFirstItem If true, searches for first item. If false, opens store homepage.
 */
export async function openStoreWithItems(options: StoreDeepLinkOptions, searchFirstItem: boolean = true): Promise<boolean> {
  const url = generateStoreDeepLink(options, searchFirstItem);

  if (!url) {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // If app deep link fails, try web URL
      const webUrl = getWebFallbackUrl(options, searchFirstItem);
      if (webUrl) {
        await Linking.openURL(webUrl);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('Error opening store link:', error);
    // Fallback to web URL
    try {
      const webUrl = getWebFallbackUrl(options, searchFirstItem);
      if (webUrl) {
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (fallbackError) {
      console.error('Error opening fallback URL:', fallbackError);
    }
    return false;
  }
}

/**
 * Get store app name for display
 */
export function getStoreAppName(storeName: string): string {
  const normalized = storeName.toLowerCase().trim();
  const config = STORE_CONFIGS[normalized];
  return config?.displayName || storeName;
}

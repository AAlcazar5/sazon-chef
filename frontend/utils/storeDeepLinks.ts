// frontend/utils/storeDeepLinks.ts
// Utility functions to generate deep links for shopping apps

import { Linking, Platform } from 'react-native';

export interface StoreDeepLinkOptions {
  storeName: string;
  items: Array<{ name: string; quantity?: string }>;
  location?: string;
}

/**
 * Generate a deep link URL for a shopping app
 * Since most stores don't support adding multiple items via URL,
 * we'll search for the first item or open the store homepage
 */
export function generateStoreDeepLink(options: StoreDeepLinkOptions, searchFirstItem: boolean = true): string | null {
  const { storeName, items, location } = options;
  const normalizedStore = storeName.toLowerCase().trim();

  // Get the first item for search, or use homepage if no items
  const firstItem = items.length > 0 ? items[0].name : '';
  const searchQuery = encodeURIComponent(firstItem);

  switch (normalizedStore) {
    case 'instacart':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `instacart://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=instacart;package=com.instacart.client;end`;
        }
        return `https://www.instacart.com/store/search?q=${searchQuery}`;
      }
      // Open homepage if no items or searchFirstItem is false
      if (Platform.OS === 'ios') {
        return `instacart://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=instacart;package=com.instacart.client;end`;
      }
      return `https://www.instacart.com/store`;

    case 'walmart':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `walmart://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=walmart;package=com.walmart.android;end`;
        }
        return `https://www.walmart.com/search?q=${searchQuery}`;
      }
      // Open Walmart homepage
      if (Platform.OS === 'ios') {
        return `walmart://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=walmart;package=com.walmart.android;end`;
      }
      return `https://www.walmart.com`;

    case 'kroger':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `kroger://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=kroger;package=com.kroger.mobileapp;end`;
        }
        return `https://www.kroger.com/search?q=${searchQuery}`;
      }
      if (Platform.OS === 'ios') {
        return `kroger://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=kroger;package=com.kroger.mobileapp;end`;
      }
      return `https://www.kroger.com`;

    case 'target':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `target://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=target;package=com.target.ui;end`;
        }
        return `https://www.target.com/s?searchTerm=${searchQuery}`;
      }
      if (Platform.OS === 'ios') {
        return `target://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=target;package=com.target.ui;end`;
      }
      return `https://www.target.com`;

    case 'safeway':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `safeway://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=safeway;package=com.safeway.client.android.safeway;end`;
        }
        return `https://www.safeway.com/shop/search-results.html?q=${searchQuery}`;
      }
      if (Platform.OS === 'ios') {
        return `safeway://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=safeway;package=com.safeway.client.android.safeway;end`;
      }
      return `https://www.safeway.com`;

    case 'whole foods':
    case 'wholefoods':
      if (searchFirstItem && firstItem) {
        if (Platform.OS === 'ios') {
          return `amazonfresh://search?q=${searchQuery}`;
        } else if (Platform.OS === 'android') {
          return `intent://search?q=${searchQuery}#Intent;scheme=amazonfresh;package=com.amazon.fresh;end`;
        }
        return `https://www.amazon.com/alm/storefront?almBrandId=WholeFoods&searchTerm=${searchQuery}`;
      }
      if (Platform.OS === 'ios') {
        return `amazonfresh://home`;
      } else if (Platform.OS === 'android') {
        return `intent://home#Intent;scheme=amazonfresh;package=com.amazon.fresh;end`;
      }
      return `https://www.amazon.com/alm/storefront?almBrandId=WholeFoods`;

    default:
      // Generic web search fallback
      if (firstItem) {
        return `https://www.google.com/search?q=${encodeURIComponent(`${storeName} ${firstItem}`)}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(storeName)}`;
  }
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
 * Get web fallback URL for a store
 */
function getWebFallbackUrl(options: StoreDeepLinkOptions, searchFirstItem: boolean = true): string | null {
  const { storeName, items } = options;
  const normalizedStore = storeName.toLowerCase().trim();
  const firstItem = items.length > 0 ? items[0].name : '';
  const searchQuery = encodeURIComponent(firstItem);

  switch (normalizedStore) {
    case 'instacart':
      if (searchFirstItem && firstItem) {
        return `https://www.instacart.com/store/search?q=${searchQuery}`;
      }
      return `https://www.instacart.com/store`;
    case 'walmart':
      if (searchFirstItem && firstItem) {
        return `https://www.walmart.com/search?q=${searchQuery}`;
      }
      return `https://www.walmart.com`;
    case 'kroger':
      if (searchFirstItem && firstItem) {
        return `https://www.kroger.com/search?q=${searchQuery}`;
      }
      return `https://www.kroger.com`;
    case 'target':
      if (searchFirstItem && firstItem) {
        return `https://www.target.com/s?searchTerm=${searchQuery}`;
      }
      return `https://www.target.com`;
    case 'safeway':
      if (searchFirstItem && firstItem) {
        return `https://www.safeway.com/shop/search-results.html?q=${searchQuery}`;
      }
      return `https://www.safeway.com`;
    case 'whole foods':
    case 'wholefoods':
      if (searchFirstItem && firstItem) {
        return `https://www.amazon.com/alm/storefront?almBrandId=WholeFoods&searchTerm=${searchQuery}`;
      }
      return `https://www.amazon.com/alm/storefront?almBrandId=WholeFoods`;
    default:
      if (firstItem) {
        return `https://www.google.com/search?q=${encodeURIComponent(`${storeName} ${firstItem}`)}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(storeName)}`;
  }
}

/**
 * Get store app name for display
 */
export function getStoreAppName(storeName: string): string {
  const normalized = storeName.toLowerCase().trim();
  
  const storeMap: Record<string, string> = {
    'instacart': 'Instacart',
    'walmart': 'Walmart',
    'kroger': 'Kroger',
    'target': 'Target',
    'safeway': 'Safeway',
    'whole foods': 'Whole Foods',
    'wholefoods': 'Whole Foods',
  };

  return storeMap[normalized] || storeName;
}


// __tests__/utils/storeDeepLinks.test.ts
// Tests for store deep link generation

import { Platform } from 'react-native';
import {
  generateStoreDeepLink,
  getStoreAppName,
  StoreDeepLinkOptions,
} from '../../utils/storeDeepLinks';

describe('storeDeepLinks', () => {
  const mockItems = [
    { name: 'Tomatoes', quantity: '2 lbs' },
    { name: 'Onions', quantity: '1 lb' },
  ];

  describe('generateStoreDeepLink', () => {
    describe('iOS deep links', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('should generate Instacart iOS deep link with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('instacart://search?q=');
        expect(url).toContain('Tomatoes');
      });

      it('should generate Walmart iOS deep link with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'walmart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('walmart://search?q=');
      });

      it('should generate Kroger iOS deep link with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'kroger',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('kroger://search?q=');
      });

      it('should generate Target iOS deep link with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'target',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('target://search?q=');
      });

      it('should generate homepage link when searchFirstItem is false', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, false);
        expect(url).toContain('instacart://home');
      });
    });

    describe('Android deep links', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('should generate Instacart Android intent with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('intent://search?q=');
        expect(url).toContain('scheme=instacart');
        expect(url).toContain('package=com.instacart.client');
      });

      it('should generate Walmart Android intent with search', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'walmart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('scheme=walmart');
        expect(url).toContain('package=com.walmart.android');
      });

      it('should generate homepage intent when searchFirstItem is false', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, false);
        expect(url).toContain('intent://home');
      });
    });

    describe('Cross-platform web fallback', () => {
      it('should generate web URL for unknown stores', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'UnknownStore',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toContain('google.com/search');
        expect(url).toContain('UnknownStore');
        expect(url).toContain('Tomatoes');
      });

      it('should handle empty items gracefully', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: [],
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });
    });

    describe('Store name normalization', () => {
      it('should handle uppercase store names', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'INSTACART',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });

      it('should handle store names with extra whitespace', () => {
        const options: StoreDeepLinkOptions = {
          storeName: '  walmart  ',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });

      it('should handle "whole foods" with space', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'whole foods',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });

      it('should handle "wholefoods" without space', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'wholefoods',
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });
    });

    describe('URL encoding', () => {
      it('should properly encode special characters in item names', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'instacart',
          items: [{ name: 'Jalapeño Peppers & Cheese' }],
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).not.toContain('&');
        expect(url).toBeTruthy();
      });

      it('should handle items with spaces', () => {
        const options: StoreDeepLinkOptions = {
          storeName: 'walmart',
          items: [{ name: 'Fresh Organic Tomatoes' }],
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
      });
    });
  });

  describe('getStoreAppName', () => {
    it('should return proper display name for instacart', () => {
      expect(getStoreAppName('instacart')).toBe('Instacart');
    });

    it('should return proper display name for walmart', () => {
      expect(getStoreAppName('walmart')).toBe('Walmart');
    });

    it('should return proper display name for kroger', () => {
      expect(getStoreAppName('kroger')).toBe('Kroger');
    });

    it('should return proper display name for target', () => {
      expect(getStoreAppName('target')).toBe('Target');
    });

    it('should return proper display name for safeway', () => {
      expect(getStoreAppName('safeway')).toBe('Safeway');
    });

    it('should return proper display name for whole foods', () => {
      expect(getStoreAppName('whole foods')).toBe('Whole Foods');
      expect(getStoreAppName('wholefoods')).toBe('Whole Foods');
    });

    it('should handle uppercase store names', () => {
      expect(getStoreAppName('INSTACART')).toBe('Instacart');
    });

    it('should return original name for unknown stores', () => {
      expect(getStoreAppName('UnknownStore')).toBe('UnknownStore');
    });
  });

  describe('Supported stores', () => {
    const supportedStores = [
      'instacart',
      'walmart',
      'kroger',
      'target',
      'safeway',
      'whole foods',
    ];

    it.each(supportedStores)(
      'should generate valid deep link for %s on iOS',
      (storeName) => {
        Platform.OS = 'ios';
        const options: StoreDeepLinkOptions = {
          storeName,
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
        expect(typeof url).toBe('string');
      }
    );

    it.each(supportedStores)(
      'should generate valid deep link for %s on Android',
      (storeName) => {
        Platform.OS = 'android';
        const options: StoreDeepLinkOptions = {
          storeName,
          items: mockItems,
        };
        const url = generateStoreDeepLink(options, true);
        expect(url).toBeTruthy();
        expect(typeof url).toBe('string');
      }
    );
  });
});

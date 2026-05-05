// frontend/__tests__/lib/revenueCat.test.ts
// ROADMAP 4.0 E4 — RevenueCat client wrapper.

const mockConfigure = jest.fn();
const mockSetLogLevel = jest.fn();
const mockLogIn = jest.fn();
const mockLogOut = jest.fn();
const mockGetOfferings = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestore = jest.fn();
const mockGetCustomerInfo = jest.fn();
const LOG_LEVEL = { VERBOSE: 'verbose', INFO: 'info', WARN: 'warn', ERROR: 'error' };

jest.mock(
  'react-native-purchases',
  () => ({
    __esModule: true,
    LOG_LEVEL: { VERBOSE: 'verbose', INFO: 'info', WARN: 'warn', ERROR: 'error' },
    default: {
      configure: (...a: unknown[]) => mockConfigure(...a),
      setLogLevel: (...a: unknown[]) => mockSetLogLevel(...a),
      LOG_LEVEL: { VERBOSE: 'verbose', INFO: 'info', WARN: 'warn', ERROR: 'error' },
      logIn: (...a: unknown[]) => mockLogIn(...a),
      logOut: (...a: unknown[]) => mockLogOut(...a),
      getOfferings: (...a: unknown[]) => mockGetOfferings(...a),
      purchasePackage: (...a: unknown[]) => mockPurchasePackage(...a),
      restorePurchases: (...a: unknown[]) => mockRestore(...a),
      getCustomerInfo: (...a: unknown[]) => mockGetCustomerInfo(...a),
    },
  }),
  { virtual: true },
);

const mockPresentPaywall = jest.fn();
const mockPresentPaywallIfNeeded = jest.fn();
const PAYWALL_RESULT = {
  NOT_PRESENTED: 'NOT_PRESENTED',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
  PURCHASED: 'PURCHASED',
  RESTORED: 'RESTORED',
};

jest.mock(
  'react-native-purchases-ui',
  () => ({
    __esModule: true,
    PAYWALL_RESULT,
    default: {
      presentPaywall: (...a: unknown[]) => mockPresentPaywall(...a),
      presentPaywallIfNeeded: (...a: unknown[]) => mockPresentPaywallIfNeeded(...a),
      PAYWALL_RESULT,
    },
  }),
  { virtual: true },
);

import { Platform } from 'react-native';

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

const ORIG_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ORIG_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_test';
  mockLogIn.mockResolvedValue({ customerInfo: { entitlements: { active: {} }, originalAppUserId: 'u' }, created: false });
  mockLogOut.mockResolvedValue({ customerInfo: { entitlements: { active: {} }, originalAppUserId: 'anon' } });
  void LOG_LEVEL;
});

afterAll(() => {
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = ORIG_IOS;
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = ORIG_ANDROID;
});

describe('initRevenueCat', () => {
  it('iOS — configures with appl_ key + appUserID and sets a log level', async () => {
    setPlatform('ios');
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();

    await initRevenueCat({ userId: 'user_42' });
    expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'appl_test', appUserID: 'user_42' });
    expect(mockSetLogLevel).toHaveBeenCalled();
    // dev or prod — both are valid; the level just needs to be one of the enum values.
    const lvl = mockSetLogLevel.mock.calls[0][0];
    expect(['verbose', 'warn']).toContain(lvl);
  });

  it('Android — configures with goog_ key', async () => {
    setPlatform('android');
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();

    await initRevenueCat({});
    expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'goog_test', appUserID: null });
  });

  it('idempotent — second call rebinds via logIn instead of configure', async () => {
    setPlatform('ios');
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();

    await initRevenueCat({ userId: 'user_42' });
    await initRevenueCat({ userId: 'user_99' });
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockLogIn).toHaveBeenCalledWith('user_99');
  });

  it('no-op when key is missing for the active platform', async () => {
    setPlatform('ios');
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();

    await initRevenueCat({ userId: 'user_42' });
    expect(mockConfigure).not.toHaveBeenCalled();
  });

  it('returns null offerings list when SDK rejects', async () => {
    setPlatform('ios');
    const { initRevenueCat, __resetRevenueCatForTest, getOfferings } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();
    await initRevenueCat({});
    mockGetOfferings.mockRejectedValueOnce(new Error('boom'));
    expect(await getOfferings()).toEqual([]);
  });
});

describe('purchase + restore + customer info', () => {
  beforeEach(async () => {
    setPlatform('ios');
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();
    await initRevenueCat({});
  });

  it('purchasePackage forwards to SDK and returns customerInfo', async () => {
    const customerInfo = { entitlements: { active: { membership: { isActive: true, productIdentifier: 'sazon_annual' } } }, originalAppUserId: 'u' };
    mockPurchasePackage.mockResolvedValueOnce({ customerInfo });
    const { purchasePackage } = require('../../lib/revenueCat');
    const pkg = { identifier: 'annual', product: { identifier: 'sazon_annual', priceString: '$60', price: 60 } };
    const got = await purchasePackage(pkg);
    expect(mockPurchasePackage).toHaveBeenCalledWith(pkg);
    expect(got).toEqual(customerInfo);
  });

  it('restorePurchases forwards to SDK', async () => {
    mockRestore.mockResolvedValueOnce({ entitlements: { active: {} }, originalAppUserId: 'u' });
    const { restorePurchases } = require('../../lib/revenueCat');
    const got = await restorePurchases();
    expect(mockRestore).toHaveBeenCalled();
    expect(got).not.toBeNull();
  });

  it('hasActiveEntitlement reads the entitlements map', () => {
    const { hasActiveEntitlement } = require('../../lib/revenueCat');
    const info = {
      entitlements: { active: { membership: { isActive: true, productIdentifier: 'p' } } },
      originalAppUserId: 'u',
    };
    expect(hasActiveEntitlement(info, 'membership')).toBe(true);
    expect(hasActiveEntitlement(info, 'missing')).toBe(false);
    expect(hasActiveEntitlement(null, 'membership')).toBe(false);
  });

  it('isSazonProEntitled returns true when the dashboard entitlement is active', async () => {
    mockGetCustomerInfo.mockResolvedValueOnce({
      entitlements: { active: { 'Sazon Chef Pro': { isActive: true, productIdentifier: 'sazon_annual' } } },
      originalAppUserId: 'u',
    });
    const { isSazonProEntitled, SAZON_PRO_ENTITLEMENT_ID } = require('../../lib/revenueCat');
    expect(SAZON_PRO_ENTITLEMENT_ID).toBe('Sazon Chef Pro');
    expect(await isSazonProEntitled()).toBe(true);
  });

  it('isSazonProEntitled returns false when the entitlement is missing', async () => {
    mockGetCustomerInfo.mockResolvedValueOnce({
      entitlements: { active: {} },
      originalAppUserId: 'u',
    });
    const { isSazonProEntitled } = require('../../lib/revenueCat');
    expect(await isSazonProEntitled()).toBe(false);
  });
});

describe('paywall presentation', () => {
  beforeEach(async () => {
    setPlatform('ios');
    const { initRevenueCat, __resetRevenueCatForTest } = require('../../lib/revenueCat');
    __resetRevenueCatForTest();
    await initRevenueCat({});
  });

  it.each([
    ['PURCHASED', 'purchased'],
    ['RESTORED', 'restored'],
    ['CANCELLED', 'cancelled'],
    ['NOT_PRESENTED', 'not_presented'],
    ['ERROR', 'error'],
  ])('presentPaywall maps %s → %s', async (raw, expected) => {
    mockPresentPaywall.mockResolvedValueOnce(raw);
    const { presentPaywall } = require('../../lib/revenueCat');
    expect(await presentPaywall()).toBe(expected);
  });

  it('presentPaywall returns "error" when the SDK throws', async () => {
    mockPresentPaywall.mockRejectedValueOnce(new Error('boom'));
    const { presentPaywall } = require('../../lib/revenueCat');
    expect(await presentPaywall()).toBe('error');
  });

  it('presentPaywallIfNeeded passes the Sazon Chef Pro entitlement by default', async () => {
    mockPresentPaywallIfNeeded.mockResolvedValueOnce('NOT_PRESENTED');
    const { presentPaywallIfNeeded } = require('../../lib/revenueCat');
    await presentPaywallIfNeeded();
    expect(mockPresentPaywallIfNeeded).toHaveBeenCalledWith({
      requiredEntitlementIdentifier: 'Sazon Chef Pro',
    });
  });

  it('presentPaywallIfNeeded honors a custom entitlement id', async () => {
    mockPresentPaywallIfNeeded.mockResolvedValueOnce('PURCHASED');
    const { presentPaywallIfNeeded } = require('../../lib/revenueCat');
    const result = await presentPaywallIfNeeded('Sazon Chef Pro Plus');
    expect(mockPresentPaywallIfNeeded).toHaveBeenCalledWith({
      requiredEntitlementIdentifier: 'Sazon Chef Pro Plus',
    });
    expect(result).toBe('purchased');
  });
});

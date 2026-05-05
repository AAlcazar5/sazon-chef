// frontend/lib/revenueCat.ts
// ROADMAP 4.0 E4 — RevenueCat client wrapper.
//
// - `initRevenueCat({ userId })` is idempotent — first call configures the
//   SDK with the per-platform public SDK key from env. Subsequent calls
//   only re-bind the user identity.
// - All native calls are routed through a single dynamic require so tests
//   and dev/web bundles don't fail when the package isn't compiled in.
// - Feature gates STILL flip via the backend webhook
//   (`/api/webhooks/revenuecat/webhook` from E4) — the SDK only drives
//   the native StoreKit / Play Billing surface and identity sync.

import { Platform } from 'react-native';

interface PurchasesPackage {
  identifier: string;
  product: { identifier: string; priceString: string; price: number };
}

interface CustomerInfo {
  entitlements: { active: Record<string, { isActive: boolean; productIdentifier: string }> };
  originalAppUserId: string;
}

interface OfferingsList {
  current: { availablePackages: PurchasesPackage[] } | null;
}

interface PurchasesModule {
  configure: (opts: { apiKey: string; appUserID?: string | null }) => void;
  logIn: (userId: string) => Promise<{ customerInfo: CustomerInfo; created: boolean }>;
  logOut: () => Promise<{ customerInfo: CustomerInfo }>;
  getOfferings: () => Promise<OfferingsList>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
  getCustomerInfo: () => Promise<CustomerInfo>;
}

let initialized = false;

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

function publicKey(): string | null {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? null;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? null;
  return null;
}

export async function initRevenueCat(opts: { userId?: string | null } = {}): Promise<void> {
  const purchases = loadPurchases();
  if (!purchases) return;

  if (!initialized) {
    const apiKey = publicKey();
    if (!apiKey) return;
    purchases.configure({ apiKey, appUserID: opts.userId ?? null });
    initialized = true;
    return;
  }

  if (opts.userId) {
    await purchases.logIn(opts.userId).catch(() => undefined);
  }
}

export async function setUserId(userId: string): Promise<void> {
  const purchases = loadPurchases();
  if (!purchases || !initialized) return;
  await purchases.logIn(userId).catch(() => undefined);
}

export async function logOut(): Promise<void> {
  const purchases = loadPurchases();
  if (!purchases || !initialized) return;
  await purchases.logOut().catch(() => undefined);
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const purchases = loadPurchases();
  if (!purchases) return [];
  try {
    const offerings = await purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  const purchases = loadPurchases();
  if (!purchases) return null;
  const { customerInfo } = await purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  const purchases = loadPurchases();
  if (!purchases) return null;
  return purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const purchases = loadPurchases();
  if (!purchases) return null;
  try {
    return await purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function hasActiveEntitlement(info: CustomerInfo | null, entitlementId: string): boolean {
  if (!info) return false;
  return info.entitlements.active[entitlementId]?.isActive === true;
}

export function __resetRevenueCatForTest(): void {
  initialized = false;
}

export type { PurchasesPackage, CustomerInfo, OfferingsList };

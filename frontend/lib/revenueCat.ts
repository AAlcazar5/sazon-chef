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

/**
 * Entitlement identifier as it appears in the RevenueCat dashboard. Keep
 * this in lockstep with the dashboard — feature gates check this string.
 */
export const SAZON_PRO_ENTITLEMENT_ID = 'Sazon Chef Pro';

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
  setLogLevel: (level: unknown) => void;
  LOG_LEVEL: { VERBOSE: unknown; INFO: unknown; WARN: unknown; ERROR: unknown };
  logIn: (userId: string) => Promise<{ customerInfo: CustomerInfo; created: boolean }>;
  logOut: () => Promise<{ customerInfo: CustomerInfo }>;
  getOfferings: () => Promise<OfferingsList>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
  getCustomerInfo: () => Promise<CustomerInfo>;
}

interface PurchasesUIModule {
  presentPaywall: () => Promise<string>;
  presentPaywallIfNeeded: (opts: { requiredEntitlementIdentifier: string }) => Promise<string>;
  PAYWALL_RESULT: {
    NOT_PRESENTED: string;
    ERROR: string;
    CANCELLED: string;
    PURCHASED: string;
    RESTORED: string;
  };
}

export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'not_presented' | 'error';

let initialized = false;

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    const def = (mod.default ?? mod) as Partial<PurchasesModule>;
    if (mod.LOG_LEVEL && def && !def.LOG_LEVEL) def.LOG_LEVEL = mod.LOG_LEVEL;
    return def as PurchasesModule;
  } catch {
    return null;
  }
}

function loadPurchasesUI(): PurchasesUIModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases-ui');
    const def = (mod.default ?? mod) as Partial<PurchasesUIModule>;
    if (mod.PAYWALL_RESULT && def && !def.PAYWALL_RESULT) def.PAYWALL_RESULT = mod.PAYWALL_RESULT;
    return def as PurchasesUIModule;
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
    // VERBOSE in dev for surfacing receipt + entitlement issues; WARN in prod.
    if (purchases.setLogLevel && purchases.LOG_LEVEL) {
      purchases.setLogLevel(__DEV__ ? purchases.LOG_LEVEL.VERBOSE : purchases.LOG_LEVEL.WARN);
    }
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

/**
 * Convenience — pulls fresh customer info and checks the Sazon Chef Pro
 * entitlement. Returns false on any failure (network error, SDK missing,
 * not configured) so callers can treat a failure as "not entitled".
 */
export async function isSazonProEntitled(): Promise<boolean> {
  const info = await getCustomerInfo();
  return hasActiveEntitlement(info, SAZON_PRO_ENTITLEMENT_ID);
}

/**
 * Present the RevenueCat-hosted paywall (configured in the dashboard).
 * Returns one of:
 *   - 'purchased' / 'restored' — premium is now active; refresh app gates
 *   - 'cancelled' — user dismissed; nothing changed
 *   - 'not_presented' / 'error' — paywall never shown (already entitled,
 *     SDK missing, or RC error)
 */
export async function presentPaywall(): Promise<PaywallOutcome> {
  const ui = loadPurchasesUI();
  if (!ui) return 'not_presented';
  try {
    const raw = await ui.presentPaywall();
    return mapPaywallResult(raw, ui.PAYWALL_RESULT);
  } catch {
    return 'error';
  }
}

/**
 * Same as `presentPaywall` but only opens if the user lacks the given
 * entitlement (defaults to Sazon Chef Pro). Use this from any feature
 * gate where the paywall is the right next step.
 */
export async function presentPaywallIfNeeded(
  entitlementId: string = SAZON_PRO_ENTITLEMENT_ID,
): Promise<PaywallOutcome> {
  const ui = loadPurchasesUI();
  if (!ui) return 'not_presented';
  try {
    const raw = await ui.presentPaywallIfNeeded({ requiredEntitlementIdentifier: entitlementId });
    return mapPaywallResult(raw, ui.PAYWALL_RESULT);
  } catch {
    return 'error';
  }
}

function mapPaywallResult(raw: string, table: PurchasesUIModule['PAYWALL_RESULT']): PaywallOutcome {
  if (raw === table.PURCHASED) return 'purchased';
  if (raw === table.RESTORED) return 'restored';
  if (raw === table.CANCELLED) return 'cancelled';
  if (raw === table.NOT_PRESENTED) return 'not_presented';
  return 'error';
}

export function __resetRevenueCatForTest(): void {
  initialized = false;
}

export type { PurchasesPackage, CustomerInfo, OfferingsList };

/**
 * Sentry frontend client wrapper.
 *
 * - `initSentry()` is idempotent — safe to call from module load and again from
 *   `_layout.tsx`. Subsequent calls are no-ops.
 * - Init is gated on `process.env.EXPO_PUBLIC_SENTRY_DSN`. If the DSN is not
 *   set (e.g. local dev without observability), Sentry is never loaded — keeps
 *   the dev bundle small and avoids spurious errors.
 * - `@sentry/react-native` is loaded via dynamic require so test environments
 *   can mock the module without the binary being installed.
 */

let initialized = false;

type SentryModule = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown) => void;
  captureMessage: (message: string) => void;
};

function loadSentry(): SentryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@sentry/react-native') as SentryModule;
    return mod;
  } catch {
    return null;
  }
}

export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const sentry = loadSentry();
  if (!sentry) return;

  sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production'),
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableAutoSessionTracking: true,
  });

  initialized = true;
}

export function captureException(error: unknown): void {
  const sentry = loadSentry();
  if (!sentry) return;
  sentry.captureException(error);
}

export function captureMessage(message: string): void {
  const sentry = loadSentry();
  if (!sentry) return;
  sentry.captureMessage(message);
}

export function __resetSentryForTest(): void {
  initialized = false;
}

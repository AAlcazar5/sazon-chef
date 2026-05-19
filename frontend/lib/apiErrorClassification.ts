// frontend/lib/apiErrorClassification.ts
//
// Pure API-error classifiers, extracted from lib/api/core.ts (kept under
// lib/ — NOT lib/api/ — so it's not a "domain" file per the apiSplit
// contract, and so core.ts stays ≤600 lines). core.ts re-exports these,
// so `lib/api` / `lib/api/core` import sites and their tests are stable.

export type NetworkFailureClass =
  | 'offline'           // No network connectivity (or DNS unreachable)
  | 'timeout'           // Server didn't respond within axios.timeout
  | 'server_unreachable'// Server actively refused (ECONNREFUSED) or TLS failure
  | 'canceled'          // AbortController.abort() — silent expected cancel
  | 'unknown_transport';// `error.request` present but code didn't match above

/**
 * Pure classifier — given an axios error's `code` / `message` / `name`,
 * returns the failure class, machine-readable code, and human-readable
 * message. Extracted from the response interceptor so it's directly
 * unit-testable without spinning up axios.
 */
export function classifyNetworkFailure(args: {
  axiosCode?: string;
  message?: string;
  name?: string;
}): { failureClass: NetworkFailureClass; code: string; message: string } {
  const { axiosCode, message, name } = args;
  if (axiosCode === 'ECONNABORTED' || axiosCode === 'ETIMEDOUT' || /timeout/i.test(message ?? '')) {
    return {
      failureClass: 'timeout',
      code: 'TIMEOUT',
      message: "The server is taking longer than expected. Give it a moment and try again.",
    };
  }
  if (axiosCode === 'ERR_CANCELED' || name === 'CanceledError') {
    return { failureClass: 'canceled', code: 'CANCELED', message: 'Request canceled.' };
  }
  if (axiosCode === 'ECONNREFUSED' || axiosCode === 'EHOSTUNREACH' || axiosCode === 'ECONNRESET') {
    return {
      failureClass: 'server_unreachable',
      code: 'SERVER_UNREACHABLE',
      message: "We can't reach the kitchen right now. We're on it — try again in a moment.",
    };
  }
  if (axiosCode === 'ERR_NETWORK' || axiosCode === 'ENETUNREACH' || axiosCode === 'ENOTFOUND') {
    return {
      failureClass: 'offline',
      code: 'OFFLINE',
      message: "You're offline. Reconnect and we'll pick up where you left off.",
    };
  }
  return {
    failureClass: 'unknown_transport',
    code: 'NETWORK_ERROR',
    message: 'Unable to reach the server. Please try again.',
  };
}

export type ApiErrorCategory =
  | 'unexpected'          // the ONLY loud one → console.error
  | 'already-saved'       // ℹ️ breadcrumb
  | 'expected-404'
  | 'quota'
  | 'expected-user'
  | 'auth-bootstrap-401'  // missing/expired token (auto-logout logs its own WARN)
  | 'auth-credential'     // wrong password / dup signup — surfaced by the auth form
  | 'ai-generation'
  | 'network';

// Login/register credential failures. These are 401/400s the user fixes
// themselves (typo'd password, email already taken) and the auth form
// shows them — they must NEVER reach console.error. Kept narrow so a real
// session-tamper 401 ("invalid token signature") still falls through.
const AUTH_CREDENTIAL_PATTERNS = [
  /email or password is incorrect/i,
  /incorrect email or password/i,
  /invalid (email or password|credentials|email|password)/i,
  /incorrect password/i,
  /wrong password/i,
  /user not found/i,
  /(email|account) already (in use|registered|exists)/i,
];

/**
 * Pure log/visibility classifier for a failed API response. Mirrors
 * `classifyNetworkFailure` — extracted so "we never log expected user
 * errors" is a unit-tested guarantee, not a buried interceptor branch.
 */
export function classifyApiError(args: {
  statusCode?: number;
  rawMessage?: string;
  rawCode?: string;
  hasResponse: boolean;
  hasRequest: boolean;
}): ApiErrorCategory {
  const { statusCode, rawCode, hasResponse, hasRequest } = args;
  const msg = String(args.rawMessage || '');

  if (!hasResponse && hasRequest) return 'network';
  if (statusCode === 409 || /already\s*saved/i.test(msg)) return 'already-saved';
  if (
    rawCode === 'GENERATION_ERROR' ||
    /failed to generate (recipe|daily meal plan)/i.test(msg)
  ) {
    return 'ai-generation';
  }
  if (
    statusCode === 429 ||
    statusCode === 503 ||
    /quota.*exceeded/i.test(msg) ||
    /too many requests/i.test(msg) ||
    /insufficient_quota/i.test(msg) ||
    /API quota exceeded/i.test(msg)
  ) {
    return 'quota';
  }
  if (
    (statusCode === 401 || statusCode === 400) &&
    AUTH_CREDENTIAL_PATTERNS.some((re) => re.test(msg))
  ) {
    return 'auth-credential';
  }
  if (
    statusCode === 401 &&
    (/no authentication token/i.test(msg) ||
      /no token provided/i.test(msg) ||
      /please login first/i.test(msg) ||
      /session has expired/i.test(msg) ||
      /please log in again/i.test(msg) ||
      /token expired/i.test(msg) ||
      /jwt expired/i.test(msg))
  ) {
    return 'auth-bootstrap-401';
  }
  if (
    statusCode === 404 &&
    (/no price data found/i.test(msg) ||
      /meal plan not found/i.test(msg) ||
      /No active meal plan/i.test(msg) ||
      /template not found/i.test(msg) ||
      /no meal prep template exists/i.test(msg) ||
      /item not found/i.test(msg) ||
      /shopping list.*not found/i.test(msg))
  ) {
    return 'expected-404';
  }
  if (statusCode === 400 || statusCode === 404) return 'expected-user';
  return 'unexpected';
}

// frontend/lib/logger.ts
// ROADMAP 4.0 U4 — Frontend logger.
//
// Replaces direct `console.*` calls in `app|components|lib|hooks`. In
// __DEV__ this is a thin pass-through to console; in production it routes
// `error` / `warn` to Sentry breadcrumbs (best-effort) and drops `info` /
// `debug` so user devices don't pay the perf + battery cost of debug logs.

type Sentry = {
  addBreadcrumb?: (b: Record<string, unknown>) => void;
  captureMessage?: (m: string, level?: string) => void;
};

function loadSentry(): Sentry | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as Sentry;
  } catch {
    return null;
  }
}

const isDev = (() => {
  try {
    return typeof __DEV__ !== 'undefined' && __DEV__;
  } catch {
    return false;
  }
})();

function emit(level: 'debug' | 'info' | 'warn' | 'error', tag: string, args: unknown[]): void {
  if (isDev) {
    // Tag the message so logs are greppable by feature in dev consoles.
    // eslint-disable-next-line no-console
    const target = (console as unknown as Record<string, (...a: unknown[]) => void>)[
      level === 'debug' ? 'log' : level
    ];
    target(`[${tag}]`, ...args);
    return;
  }
  if (level === 'warn' || level === 'error') {
    const sentry = loadSentry();
    if (!sentry) return;
    sentry.addBreadcrumb?.({
      category: tag,
      level,
      message: args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).join(' '),
    });
    if (level === 'error') {
      sentry.captureMessage?.(`[${tag}] ${safeStringify(args[0])}`, 'error');
    }
  }
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** Create a tagged logger. The tag prefixes every log line in dev. */
export function createLogger(tag: string): Logger {
  return {
    debug: (...a) => emit('debug', tag, a),
    info: (...a) => emit('info', tag, a),
    warn: (...a) => emit('warn', tag, a),
    error: (...a) => emit('error', tag, a),
  };
}

/** Default app-wide logger. */
export const logger = createLogger('Sazon');

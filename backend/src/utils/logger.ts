// backend/src/utils/logger.ts
// Structured logger. Pino + pino-pretty for dev, JSON for prod.
//
// Migration target for the previous console.* sprawl. Use:
//   logger.info({ userId }, 'foo.action')
//   logger.error({ err }, 'foo.failed')
//   logger.warn('foo.deprecated')
//
// PII redaction is enforced via the redact paths below. Add new sensitive
// keys here as the schema grows; redaction is a hard requirement, not a
// nice-to-have — many fields end up in third-party log aggregators.

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : isTest ? 'silent' : 'info'),
  transport: isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'resetCode',
      'apiKey',
      'jwt',
      '*.password',
      '*.token',
      '*.resetCode',
      '*.apiKey',
      '*.authorization',
    ],
    remove: true,
  },
});

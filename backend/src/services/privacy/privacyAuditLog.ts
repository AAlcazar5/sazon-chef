// backend/src/services/privacy/privacyAuditLog.ts
// Tier Q10 — privacy audit log.
//
// GDPR/CCPA requires a record of every access request (export, deletion,
// rectification). The bar is "we can produce a tamper-evident log on
// regulator request". We meet it by writing structured log lines tagged
// `privacy.audit` — pino's existing JSON output goes to disk + Sentry +
// any external log aggregator, all of which provide their own integrity
// guarantees. A dedicated Prisma table would add migration overhead
// without buying additional compliance value at this scale.
//
// Each audit row is shaped:
//   { event, userId, at, ip?, ua?, summary?, reason? }

import { logger } from '../../utils/logger';

export type PrivacyAuditEvent =
  | 'data_export.requested'
  | 'data_export.succeeded'
  | 'data_export.failed'
  | 'account.delete.requested'
  | 'account.delete.succeeded'
  | 'account.delete.failed';

export interface PrivacyAuditRow {
  event: PrivacyAuditEvent;
  userId: string;
  at: string;
  ip?: string;
  ua?: string;
  summary?: Record<string, unknown>;
  reason?: string;
}

/**
 * Record a privacy event. Always emits at info level (audit logs are
 * intentionally non-debug-suppressible).
 */
export function recordPrivacyAudit(row: Omit<PrivacyAuditRow, 'at'>): PrivacyAuditRow {
  const stamped: PrivacyAuditRow = { ...row, at: new Date().toISOString() };
  logger.info({ audit: stamped }, 'privacy.audit');
  return stamped;
}

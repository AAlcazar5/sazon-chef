// Tier Q10 — privacy compliance ratchet.
//
// Three contracts:
//   1. Coverage parity — EXPORTED_MODELS in dataExportService.ts MUST
//      list every Prisma model that carries `userId`. Drift (new model
//      added to schema without updating the export allowlist) fails
//      this test → fails CI → blocks the merge.
//   2. Cascade safety — every userId relation MUST declare
//      `onDelete: Cascade` so `prisma.user.delete()` actually purges
//      the row (vs leaving orphans that violate GDPR right-to-erasure).
//   3. Audit log — recordPrivacyAudit produces a structured row with
//      every required field, the at-timestamp is ISO, and bad event
//      names are caught at compile time (TypeScript) not runtime.

import * as fs from 'fs';
import * as path from 'path';
import {
  EXPORTED_MODELS,
  EXPORT_EXCLUDED_MODELS,
  exportUserData,
  summarizeExport,
} from '../../src/services/privacy/dataExportService';
import { recordPrivacyAudit } from '../../src/services/privacy/privacyAuditLog';

const SCHEMA_PATH = path.resolve(__dirname, '../../prisma/schema.prisma');

interface ParsedModel {
  name: string;
  hasUserIdField: boolean;
  userRelationLine: string | null;
}

function parseSchema(): ParsedModel[] {
  const src = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const lines = src.split('\n');
  const models: ParsedModel[] = [];
  let current: ParsedModel | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('model ')) {
      // model Foo {
      const m = line.match(/^model\s+(\w+)\s*\{/);
      if (m) {
        current = { name: m[1], hasUserIdField: false, userRelationLine: null };
        models.push(current);
      }
      continue;
    }
    if (line === '}' && current) {
      current = null;
      continue;
    }
    if (!current) continue;
    // `userId String` or `userId String?` or `userId String @unique` etc.
    if (/^userId\s+String/.test(line)) {
      current.hasUserIdField = true;
    }
    // The user-relation line: `user User @relation(fields: [userId], ...)`
    if (/^user\s+User\??\s+@relation\(/.test(line)) {
      current.userRelationLine = line;
    }
  }

  return models;
}

describe('Q10 — privacy compliance', () => {
  describe('coverage parity (export ↔ schema)', () => {
    const allModels = parseSchema();
    const userIdModels = allModels
      .filter((m) => m.hasUserIdField)
      .map((m) => m.name)
      .filter((n) => !EXPORT_EXCLUDED_MODELS.has(n))
      .sort();

    it('parsed at least 40 userId-bearing models from schema (sanity)', () => {
      expect(userIdModels.length).toBeGreaterThanOrEqual(40);
    });

    it('EXPORTED_MODELS includes every userId-bearing model in schema.prisma', () => {
      const exportedSet = new Set<string>(EXPORTED_MODELS as readonly string[]);
      const missing = userIdModels.filter((m) => !exportedSet.has(m));
      if (missing.length > 0) {
        throw new Error(
          `Schema has ${missing.length} userId-bearing model(s) NOT in EXPORTED_MODELS:\n  ${missing.join('\n  ')}\n` +
            `Add to backend/src/services/privacy/dataExportService.ts EXPORTED_MODELS allowlist (or to EXPORT_EXCLUDED_MODELS if intentionally omitted).`,
        );
      }
      expect(missing).toEqual([]);
    });

    it('EXPORTED_MODELS does not list models that are not in the schema', () => {
      const schemaSet = new Set<string>(allModels.map((m) => m.name));
      const orphans = (EXPORTED_MODELS as readonly string[]).filter(
        (m) => !schemaSet.has(m),
      );
      expect(orphans).toEqual([]);
    });
  });

  describe('cascade safety (right-to-erasure)', () => {
    const allModels = parseSchema();
    const userIdModels = allModels.filter((m) => m.hasUserIdField);

    /**
     * Models with `userId` but no `user User @relation(...)` line. Found in
     * the 2026-05-10 Q10 audit. Compensating control: deleteAccount
     * manually purges these tables before calling `prisma.user.delete()`.
     * Move each entry off this list (and remove the manual-purge line)
     * once a schema migration adds the proper relation.
     */
    const ORPHAN_NO_RELATION_KNOWN: ReadonlySet<string> = new Set([
      'AdaptiveNotificationLog',
      'DailyCheckIn',
      'MergeDismissal',
      'MissingIngredient',
      'NutritionCoverageSnapshot',
      'SurfaceEvent',
      'UserCuisineAdjacencyWeight',
      'UserSignalSnapshot',
    ]);

    /**
     * Models with `onDelete: SetNull` rather than Cascade. SetNull leaves
     * the row with userId=null — content survives, ownership doesn't.
     * Whether that satisfies GDPR depends on whether the remaining fields
     * are still PII. Tracked here pending a privacy-counsel review.
     */
    const SETNULL_KNOWN: ReadonlySet<string> = new Set([
      // user-created MealComponent — content survives as a system-owned
      // component after the user is gone. Acceptable: the recipe library
      // is shared. Userdata is dissociated, not retained.
      'MealComponent',
      // Stripe + RevenueCat webhook event log — kept for billing audit
      // trail. Each event is anonymized at the user side via SetNull;
      // the event row stays for the finance team's reconciliation needs.
      'RevenueCatWebhookEvent',
      'StripeWebhookEvent',
    ]);

    for (const model of userIdModels) {
      it(`${model.name}.user relation declares onDelete: Cascade (or is on the known-violation list)`, () => {
        if (!model.userRelationLine) {
          if (ORPHAN_NO_RELATION_KNOWN.has(model.name)) {
            // Known orphan — deleteAccount has a manual purge. Pass.
            expect(ORPHAN_NO_RELATION_KNOWN.has(model.name)).toBe(true);
            return;
          }
          throw new Error(
            `${model.name}: has userId field but no \`user User @relation(...)\` line. ` +
              `Add the relation in schema.prisma OR add this model to ORPHAN_NO_RELATION_KNOWN ` +
              `with a corresponding manual purge in userController.deleteAccount.`,
          );
        }
        if (SETNULL_KNOWN.has(model.name)) {
          expect(model.userRelationLine).toMatch(/onDelete:\s*(Cascade|SetNull)/);
          return;
        }
        expect(model.userRelationLine).toContain('onDelete: Cascade');
      });
    }

    it('every ORPHAN_NO_RELATION_KNOWN entry actually exists in the schema (no stale list)', () => {
      const userIdModelNames = new Set(userIdModels.map((m) => m.name));
      for (const orphan of ORPHAN_NO_RELATION_KNOWN) {
        expect(userIdModelNames.has(orphan)).toBe(true);
      }
    });
  });

  describe('exportUserData (smoke)', () => {
    it('throws on empty userId', async () => {
      await expect(exportUserData('')).rejects.toThrow();
    });

    it('returns a DataExportResult shape with mocked client', async () => {
      // Build a fake prisma client where every delegate returns []. Verifies
      // the iteration covers every model without throwing.
      const fakeClient: any = {};
      for (const m of EXPORTED_MODELS) {
        const delegateName = m.charAt(0).toLowerCase() + m.slice(1);
        fakeClient[delegateName] = { findMany: async () => [] };
      }
      fakeClient.user = { findUnique: async () => ({ id: 'u-1', email: 'x@y.z' }) };

      const out = await exportUserData('u-1', { client: fakeClient });
      expect(out.userId).toBe('u-1');
      expect(typeof out.exportedAt).toBe('string');
      expect(Array.isArray(out.emptyModels)).toBe(true);
      expect(Array.isArray(out.failedModels)).toBe(true);
      // Every allowlisted model produced 0 rows → appears in emptyModels.
      expect(out.emptyModels.length).toBe(EXPORTED_MODELS.length);
      // The User row was fetched and stored as `User`.
      expect(out.models.User).toEqual([{ id: 'u-1', email: 'x@y.z' }]);
    });

    it('handles a delegate that throws — failedModels captures reason', async () => {
      const fakeClient: any = {};
      for (const m of EXPORTED_MODELS) {
        const delegateName = m.charAt(0).toLowerCase() + m.slice(1);
        fakeClient[delegateName] = {
          findMany: async () => {
            throw new Error('db disconnected');
          },
        };
      }
      fakeClient.user = { findUnique: async () => null };

      const out = await exportUserData('u-1', { client: fakeClient });
      expect(out.failedModels.length).toBe(EXPORTED_MODELS.length);
      expect(out.failedModels[0].reason).toBe('db disconnected');
    });

    it('summarizeExport returns counts only, no row content', () => {
      const summary = summarizeExport({
        userId: 'u-1',
        exportedAt: new Date().toISOString(),
        models: { A: [{ id: 1 }, { id: 2 }], B: [{ id: 3 }] },
        emptyModels: ['C'],
        failedModels: [{ model: 'D', reason: 'boom' }],
      });
      expect(summary).toEqual({
        totalRows: 3,
        modelsWithData: 2,
        modelsEmpty: 1,
        modelsFailed: 1,
      });
    });
  });

  describe('recordPrivacyAudit', () => {
    it('stamps `at` as an ISO timestamp', () => {
      const row = recordPrivacyAudit({
        event: 'data_export.requested',
        userId: 'u-1',
      });
      expect(row.event).toBe('data_export.requested');
      expect(row.userId).toBe('u-1');
      expect(typeof row.at).toBe('string');
      expect(() => new Date(row.at)).not.toThrow();
      expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('preserves optional fields when present', () => {
      const row = recordPrivacyAudit({
        event: 'data_export.succeeded',
        userId: 'u-1',
        ip: '1.2.3.4',
        ua: 'TestAgent/1.0',
        summary: { keys: 42 },
      });
      expect(row.ip).toBe('1.2.3.4');
      expect(row.ua).toBe('TestAgent/1.0');
      expect(row.summary).toEqual({ keys: 42 });
    });
  });
});

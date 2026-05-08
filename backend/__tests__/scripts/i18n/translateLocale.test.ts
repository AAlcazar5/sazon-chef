// ROADMAP 4.0 Tier i18n-OPS7 — translateLocale CLI smoke test.
//
// Dry-run path needs no API key: it just reads the source + target locale
// files, computes the diff, prints, and returns counts. This protects the
// CLI glue from regressing the "what would I translate?" preview that
// reviewers will use before burning DeepL quota.

import { run } from '../../../scripts/i18n/translateLocale';

describe('translateLocale (dry-run)', () => {
  it('reports missing keys without calling DeepL', async () => {
    const fetchSpy = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const result = await run('es', true);
      expect(result.added).toBe(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('throws when locale is empty', async () => {
    await expect(run('', false)).rejects.toThrow(/Usage/);
  });
});

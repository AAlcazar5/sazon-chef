// ROADMAP 4.0 N3.2 — cap test: every rationale / insight / voice-prose
// builder imports from `sazonVoiceService` instead of inlining its own
// prose templates. New builders that violate this fail the test.
//
// Currently enforced files:
//   - recipeDiscoveryInsightService.ts (RD6.1) — routed through voice service
//   - recommender/bridgeFromLeftover.ts (RD4.1) — routed through voice service
//
// As future tiers (HX0.2, WK8.1, IG10.1, FX3.2) ship their rationale
// builders, add their files to ENFORCED_FILES below.

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_ROOT = path.resolve(__dirname, '../../src/services');

const ENFORCED_FILES: string[] = [
  'recipeDiscoveryInsightService.ts',
  'recommender/bridgeFromLeftover.ts',
];

function readService(rel: string): string {
  const full = path.join(SERVICES_ROOT, rel);
  return fs.readFileSync(full, 'utf-8');
}

describe('N3.2 — rationale builders route through sazonVoiceService', () => {
  for (const rel of ENFORCED_FILES) {
    it(`${rel} imports from sazonVoiceService`, () => {
      const src = readService(rel);
      const importsVoice = /from\s+['"][^'"]*sazonVoiceService['"]/i.test(src);
      expect(importsVoice).toBe(true);
    });
  }

  it('the voice service file itself exists', () => {
    expect(fs.existsSync(path.join(SERVICES_ROOT, 'sazonVoiceService.ts'))).toBe(
      true,
    );
  });

  it('the canonical banned-vocab corpus lives in src (not test fixtures)', () => {
    expect(
      fs.existsSync(
        path.join(SERVICES_ROOT, 'voice/bannedVocabularyCorpus.ts'),
      ),
    ).toBe(true);
  });
});

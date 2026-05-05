// frontend/__tests__/quality/oversizedFiles.test.ts
// ROADMAP 4.0 R4 — Cap CI failure if oversized frontend files grow without
// being split. CLAUDE.md says 800 lines is the soft ceiling; this test caps
// each known-oversized file at its current size, so splits land as
// improvements but no file silently grows.

import { execSync } from 'child_process';
import path from 'path';

const FRONTEND = path.resolve(__dirname, '../..');

function lineCount(rel: string): number {
  try {
    const out = execSync(`wc -l < "${path.join(FRONTEND, rel)}"`, { encoding: 'utf-8' });
    return Number(out.trim());
  } catch {
    return 0;
  }
}

const CAPS: Record<string, number> = {
  'lib/api.ts': 2700,
  'app/modal.tsx': 2700,
  'app/(tabs)/cookbook.tsx': 2100,
  'hooks/useMealPlanActions.ts': 1900,
  'hooks/useShoppingList.ts': 1900,
  'app/(tabs)/meal-plan.tsx': 1400,
  'app/recipe-form.tsx': 1400,
  'app/(tabs)/index.tsx': 1400,
  'app/onboarding.tsx': 1300,
  'hooks/useProfileData.ts': 1300,
  'lib/foodIntelTips.ts': 1200,
  'lib/kitchenIQ/cards.ts': 1100,
  'app/scanner.tsx': 1100,
  'app/cooking.tsx': 1100,
};

describe('Oversized frontend files (R4)', () => {
  for (const [rel, cap] of Object.entries(CAPS)) {
    it(`${rel} stays at or below ${cap} LOC`, () => {
      const actual = lineCount(rel);
      expect(actual).toBeLessThanOrEqual(cap);
    });
  }
});

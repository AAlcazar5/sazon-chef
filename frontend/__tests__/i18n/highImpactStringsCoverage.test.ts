// i18n-OPS3.2 — high-impact string coverage cap.
//
// Pins the list of user-facing keys that MUST have a base translation in
// every shipped non-English locale (es, pt). The list is the "highest-
// impact" surface per the roadmap: tabs, Today hero, Sazon chat first
// impression, the entire onboarding sequence, the paywall, and common
// verbs/errors that appear across every screen.
//
// What this test does NOT pin:
//   - Long-tail recipe-detail strings (Sazon translates inline; per
//     i18n-OPS6 anti-goal full content translation is a separate project).
//   - Regional variants (es-MX/pt-PT/etc.). Those are delta files and may
//     omit any key — they fall through to base via buildFallbackChain.
//   - Marketing site or blog (separate from app).
//
// Adding a new high-impact surface? Add its keys to CRITICAL_KEYS and
// translate them in every base bundle in the same diff.

import en from '../../i18n/locales/en.json';
import es from '../../i18n/locales/es.json';
import pt from '../../i18n/locales/pt.json';

const CRITICAL_KEYS: ReadonlyArray<string> = [
  // tabs (every screen)
  'tabs.today',
  'tabs.week',
  'tabs.kitchen',
  'tabs.sazon',
  // Today (the magazine cover)
  'today.hero.eyebrow.tonight',
  'today.empty.title',
  'today.empty.subtitle',
  'today.cta.surpriseMe',
  'today.cta.findMeMeal',
  // kitchen view modes
  'kitchen.tab.saved',
  'kitchen.tab.collections',
  'kitchen.tab.discover',
  'kitchen.tab.journey',
  'kitchen.tab.stories',
  // Sazon (chat first impression)
  'sazon.composer.placeholder',
  'sazon.empty.title',
  'sazon.empty.description',
  'sazon.error.generic',
  // onboarding (Day-1 lifestyle pitch)
  'onboarding.welcome.title',
  'onboarding.welcome.subtitle',
  'onboarding.eatStyle.question',
  'onboarding.cuisines.question',
  'onboarding.allergens.question',
  'onboarding.skill.question',
  'onboarding.skill.beginner',
  'onboarding.skill.cook',
  'onboarding.skill.chef',
  'onboarding.complete.title',
  'onboarding.complete.subtitle',
  // paywall (revenue gate)
  'paywall.hero.title',
  'paywall.hero.subtitle',
  'paywall.greeting',
  'paywall.cta.upgrade',
  'paywall.cta.notNow',
  'paywall.trust.cancel',
  // common (every screen)
  'common.cancel',
  'common.save',
  'common.done',
  'common.next',
  'common.back',
  'common.close',
  'common.edit',
  'common.error.network',
  'common.error.unknown',
];

// Brand-name keys whose value is mostly an untranslatable proper noun —
// "Sazon" stays "Sazon" in every locale. We don't fail the parity check
// on these.
const BRAND_KEYS: ReadonlySet<string> = new Set([
  'tabs.sazon',
]);

const BASE_LOCALES: Record<'en' | 'es' | 'pt', Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
  pt: pt as Record<string, string>,
};

describe('i18n-OPS3.2 — high-impact string coverage', () => {
  it('every critical key resolves to a non-empty string in every base locale', () => {
    const missing: string[] = [];
    for (const [loc, dict] of Object.entries(BASE_LOCALES)) {
      for (const key of CRITICAL_KEYS) {
        const v = dict[key];
        if (typeof v !== 'string' || v.trim().length === 0) {
          missing.push(`${loc}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('Spanish translations differ from English (catches copy-paste regressions)', () => {
    const identical: string[] = [];
    for (const key of CRITICAL_KEYS) {
      if (BRAND_KEYS.has(key)) continue;
      const enV = (en as Record<string, string>)[key];
      const esV = (es as Record<string, string>)[key];
      if (enV && esV && enV === esV) identical.push(key);
    }
    expect(identical).toEqual([]);
  });

  it('Portuguese translations differ from English (catches copy-paste regressions)', () => {
    const identical: string[] = [];
    for (const key of CRITICAL_KEYS) {
      if (BRAND_KEYS.has(key)) continue;
      const enV = (en as Record<string, string>)[key];
      const ptV = (pt as Record<string, string>)[key];
      if (enV && ptV && enV === ptV) identical.push(key);
    }
    expect(identical).toEqual([]);
  });

  it('templated strings preserve their {{interpolation}} markers across locales', () => {
    const TEMPLATED = ['paywall.greeting', 'onboarding.complete.title'];
    for (const key of TEMPLATED) {
      for (const [loc, dict] of Object.entries(BASE_LOCALES)) {
        const v = dict[key];
        expect(v).toBeDefined();
        // interpolation marker survives translation; otherwise the rendered
        // string would show "Hey , welcome to Pro" with a missing name.
        expect(v).toMatch(/\{\{name\}\}/);
        // Per-locale assertion gives a useful failure message
        expect({ loc, key, value: v }).toMatchObject({
          loc: expect.any(String),
          key,
          value: expect.stringMatching(/\{\{name\}\}/),
        });
      }
    }
  });

  it('CRITICAL_KEYS breadth stays at or above 40 (commitment lock)', () => {
    // Adding more high-impact keys is welcome — silently shrinking the list
    // would erode the i18n-OPS3.2 guarantee.
    expect(CRITICAL_KEYS.length).toBeGreaterThanOrEqual(40);
  });
});

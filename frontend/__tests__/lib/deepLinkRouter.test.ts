// U2: Deep-link router test.
//
// `app.json` declares `scheme: sazon` but until U2 no `Linking` handler
// existed — incoming `sazon://...` URLs were silent no-ops.
//
// `lib/deepLinkRouter.ts` resolves a raw URL string (sazon://recipe/abc123,
// https://sazonchef.app/recipe/abc123, etc.) into an expo-router target the
// `_layout.tsx` listener can `router.push()`. Unknown paths fall through to
// the Today tab. Every notification deep-link template registered in
// `notificationDeepLink.ts` has a matching handler here.

import {
  resolveDeepLink,
  isRecognizedDeepLink,
  __SUPPORTED_PATHS_FOR_TESTS,
} from '../../lib/deepLinkRouter';
import {
  getMappedTemplates,
  mapNotificationToDeepLink,
} from '../../lib/notificationDeepLink';

describe('U2: deepLinkRouter', () => {
  describe('sazon:// scheme URLs', () => {
    it('resolves /recipe/:id to the recipe route', () => {
      const t = resolveDeepLink('sazon://recipe/abc123');
      expect(t.pathname).toBe('/recipe/abc123');
      expect(t.params).toEqual({});
    });

    it('resolves /build-a-plate to the BAP screen', () => {
      const t = resolveDeepLink('sazon://build-a-plate');
      expect(t.pathname).toBe('/build-a-plate');
    });

    it('resolves /coach to the Sazon tab', () => {
      const t = resolveDeepLink('sazon://coach');
      expect(t.pathname).toBe('/(tabs)/coach');
    });

    it('resolves /today (and bare /) to the Today tab', () => {
      expect(resolveDeepLink('sazon://today').pathname).toBe('/(tabs)');
      expect(resolveDeepLink('sazon://').pathname).toBe('/(tabs)');
    });

    it('resolves /week to the meal-plan tab', () => {
      expect(resolveDeepLink('sazon://week').pathname).toBe('/(tabs)/meal-plan');
    });

    it('resolves /kitchen to the cookbook tab', () => {
      expect(resolveDeepLink('sazon://kitchen').pathname).toBe('/(tabs)/cookbook');
    });

    it('resolves /plate/:slug to the plate route', () => {
      const t = resolveDeepLink('sazon://plate/2026-05-11');
      expect(t.pathname).toBe('/plate/2026-05-11');
    });

    it('preserves query params on a resolved target', () => {
      const t = resolveDeepLink('sazon://recipe/abc123?source=push&anchor=cook');
      expect(t.pathname).toBe('/recipe/abc123');
      expect(t.params).toMatchObject({ source: 'push', anchor: 'cook' });
    });
  });

  describe('universal HTTPS links', () => {
    it('resolves https://sazonchef.app/recipe/:id identically', () => {
      const t = resolveDeepLink('https://sazonchef.app/recipe/abc123');
      expect(t.pathname).toBe('/recipe/abc123');
    });
  });

  describe('unknown / malformed paths', () => {
    it('falls through to Today for unknown paths', () => {
      const t = resolveDeepLink('sazon://does-not-exist');
      expect(t.pathname).toBe('/(tabs)');
    });

    it('falls through to Today for completely malformed input', () => {
      expect(resolveDeepLink('').pathname).toBe('/(tabs)');
      expect(resolveDeepLink('not a url at all').pathname).toBe('/(tabs)');
      expect(resolveDeepLink(null as unknown as string).pathname).toBe('/(tabs)');
    });
  });

  // U2 regression guard — cold-start infinite-loop fix.
  //
  // Before this guard, _layout.tsx's URL listener pushed `/(tabs)` for ANY
  // non-null URL Linking.getInitialURL() returned — including the Expo dev
  // launcher URL (`exp://localhost:8000/...`), which fired on every cold
  // start. Combined with `[router]` in the useEffect deps (router is not
  // perfectly stable), this caused an infinite remount loop: every render
  // → getInitialURL → resolveDeepLink → FALLBACK `/(tabs)` →
  // router.push('/(tabs)') → re-render → repeat. Auth never completed.
  //
  // These tests pin the recognition logic so that regression can't return.
  describe('isRecognizedDeepLink (cold-start loop guard)', () => {
    it.each([
      'sazon://recipe/abc123',
      'sazon://build-a-plate',
      'sazon://',
      'sazon://coach?source=push',
      'https://sazonchef.app/recipe/abc123',
      'https://sazonchef.com/recipe/abc',
      'https://www.sazonchef.app/recipe/abc',
      'http://sazonchef.app/r/x', // dev / pre-cert
    ])('recognizes brand-namespaced URL: %s', (url) => {
      expect(isRecognizedDeepLink(url)).toBe(true);
    });

    it.each([
      // The actual culprit: Expo dev launcher URL hands `getInitialURL()`
      // returns on cold start. Must NOT trigger a push.
      'exp://localhost:8000',
      'exp://localhost:8000/--/(tabs)',
      'exp://192.168.1.42:19000/--/(tabs)',
      'exps://exp.host/@user/sazon',
      // Arbitrary launch URLs from external apps. Must NOT trigger a push.
      'https://google.com',
      'https://example.com/recipe/abc',
      'http://localhost:3000',
      // OS bug / weird input. Must NOT trigger a push.
      '',
      'not a url',
      'about:blank',
      'data:text/html,<h1>hi</h1>',
    ])('rejects non-brand URL: %s', (url) => {
      expect(isRecognizedDeepLink(url)).toBe(false);
    });

    it('rejects null / undefined / non-string input (defensive)', () => {
      expect(isRecognizedDeepLink(null)).toBe(false);
      expect(isRecognizedDeepLink(undefined)).toBe(false);
      expect(isRecognizedDeepLink(123 as unknown as string)).toBe(false);
      expect(isRecognizedDeepLink({} as unknown as string)).toBe(false);
    });

    it("doesn't false-positive on URLs that merely CONTAIN 'sazon'", () => {
      expect(isRecognizedDeepLink('https://impostor-sazon.com/recipe')).toBe(false);
      expect(isRecognizedDeepLink('https://example.com/sazon-clone')).toBe(false);
      expect(isRecognizedDeepLink('https://sazonchef.evil.com/recipe')).toBe(false);
    });
  });

  describe('notificationDeepLink invariant', () => {
    it('every notification template resolves to a supported handler', () => {
      const templates = getMappedTemplates();
      expect(templates.length).toBeGreaterThan(0);
      for (const tpl of templates) {
        const target = mapNotificationToDeepLink(tpl);
        const supported = __SUPPORTED_PATHS_FOR_TESTS.some((m) =>
          m.test(target.pathname),
        );
        expect({ template: tpl, pathname: target.pathname, supported }).toEqual({
          template: tpl,
          pathname: target.pathname,
          supported: true,
        });
      }
    });
  });
});

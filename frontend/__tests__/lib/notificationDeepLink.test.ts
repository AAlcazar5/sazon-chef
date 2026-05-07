// ROADMAP 4.0 N9.1 — notificationDeepLink test.

import {
  mapNotificationToDeepLink,
  buildDeepLinkUrl,
  getMappedTemplates,
  __SURFACE_MAP_FOR_TESTS,
  type NotificationTemplate,
  type DeepLinkTarget,
} from '../../lib/notificationDeepLink';

describe('N9.1 — surface map shape', () => {
  it('every C12-shipped template has an in-app surface anchor', () => {
    const shipped: NotificationTemplate[] = [
      'expiring-pantry',
      'no-plan-tonight',
      'fiber-gap',
      'low-variety',
    ];
    for (const t of shipped) {
      const target = __SURFACE_MAP_FOR_TESTS[t];
      expect(target).toBeDefined();
      expect(target.anchor).toBeTruthy();
      expect(target.pathname).toBeTruthy();
    }
  });

  it('every planned template (running-low / nutrient-gap / week-recap / near-miss-discovery / pantry-iq-weekly) is also mapped', () => {
    const planned: NotificationTemplate[] = [
      'running-low',
      'nutrient-gap',
      'week-recap',
      'near-miss-discovery',
      'pantry-iq-weekly',
    ];
    for (const t of planned) {
      expect(__SURFACE_MAP_FOR_TESTS[t]).toBeDefined();
    }
  });

  it('getMappedTemplates returns all 9 entries', () => {
    expect(getMappedTemplates().length).toBe(9);
  });

  it('every target carries a `notification` query param matching its template id', () => {
    for (const [template, target] of Object.entries(__SURFACE_MAP_FOR_TESTS)) {
      expect(target.params.notification).toBe(template);
    }
  });
});

describe('N9.1 — mapNotificationToDeepLink', () => {
  it('maps expiring-pantry to Today + use-it-up-strip anchor', () => {
    const t = mapNotificationToDeepLink('expiring-pantry');
    expect(t.pathname).toBe('/(tabs)');
    expect(t.anchor).toBe('use-it-up-strip');
    expect(t.params.notification).toBe('expiring-pantry');
  });

  it('maps fiber-gap to Today + nutrition-strip anchor', () => {
    const t = mapNotificationToDeepLink('fiber-gap');
    expect(t.anchor).toBe('nutrition-strip');
  });

  it('maps week-recap to /(tabs)/meal-plan + plan-iq-card anchor', () => {
    const t = mapNotificationToDeepLink('week-recap');
    expect(t.pathname).toBe('/(tabs)/meal-plan');
    expect(t.anchor).toBe('plan-iq-card');
  });

  it('maps near-miss-discovery to almost-made-it anchor (HX5)', () => {
    expect(mapNotificationToDeepLink('near-miss-discovery').anchor).toBe(
      'almost-made-it',
    );
  });

  it('maps pantry-iq-weekly to Kitchen → discover with pantry-iq-card anchor', () => {
    const t = mapNotificationToDeepLink('pantry-iq-weekly');
    expect(t.pathname).toBe('/(tabs)/cookbook');
    expect(t.params.view).toBe('discover');
    expect(t.anchor).toBe('pantry-iq-card');
  });

  it('merges caller payload with default params', () => {
    const t = mapNotificationToDeepLink('expiring-pantry', {
      ingredient: 'cilantro',
    });
    expect(t.params.notification).toBe('expiring-pantry');
    expect(t.params.ingredient).toBe('cilantro');
  });

  it('unknown template falls back to plain Today open (legacy graceful)', () => {
    const t = mapNotificationToDeepLink('mystery-template');
    expect(t.pathname).toBe('/(tabs)');
    expect(t.anchor).toBe('today-hero');
    expect(t.params.notification).toBeUndefined();
  });

  it('null / undefined template falls back to plain Today open', () => {
    expect(mapNotificationToDeepLink(null).pathname).toBe('/(tabs)');
    expect(mapNotificationToDeepLink(undefined).anchor).toBe('today-hero');
  });
});

describe('N9.1 — buildDeepLinkUrl', () => {
  it('serializes params into the URL', () => {
    const target: DeepLinkTarget = {
      pathname: '/(tabs)',
      params: { notification: 'expiring-pantry', ingredient: 'cilantro' },
      anchor: 'use-it-up-strip',
    };
    const url = buildDeepLinkUrl(target);
    expect(url).toContain('/(tabs)?');
    expect(url).toContain('notification=expiring-pantry');
    expect(url).toContain('ingredient=cilantro');
  });

  it('omits the trailing ? when no params', () => {
    expect(
      buildDeepLinkUrl({
        pathname: '/(tabs)',
        params: {},
        anchor: 'today-hero',
      }),
    ).toBe('/(tabs)');
  });
});

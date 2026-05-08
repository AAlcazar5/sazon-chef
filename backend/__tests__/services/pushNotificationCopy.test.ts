// ROADMAP 4.0 i18n-OPS3.3 — push notification template i18n.
//
// Verifies that all push notification templates render in en, es, pt
// (and the regional variants es-MX, es-AR, es-ES, es-CO, pt-BR, pt-PT
// that we already ship for the coach persona). Locale fallbacks must walk
// BCP 47 chain: es-MX → es → en, pt-AR → pt → en, etc.

import {
  pushCopy,
  TEMPLATE_IDS,
  type PushTemplateId,
} from '../../src/services/pushNotificationCopy';

describe('pushNotificationCopy — i18n templates', () => {
  describe('shoppingListReady', () => {
    it('renders in English with item count plural', () => {
      const out = pushCopy.shoppingListReady('en', { itemCount: 12 });
      expect(out.title).toBe('Your shopping list is ready');
      expect(out.body).toContain('12 items');
    });

    it('renders singular in English with itemCount=1', () => {
      const out = pushCopy.shoppingListReady('en', { itemCount: 1 });
      expect(out.body).toContain('1 item ');
    });

    it('renders in Spanish base', () => {
      const out = pushCopy.shoppingListReady('es', { itemCount: 7 });
      expect(out.title.toLowerCase()).toContain('compra');
      expect(out.body).toContain('7');
    });

    it('falls back es-MX → es', () => {
      const out = pushCopy.shoppingListReady('es-MX', { itemCount: 3 });
      expect(out.title.toLowerCase()).toContain('compra');
      expect(out.body).toContain('3');
    });

    it('renders in Portuguese base', () => {
      const out = pushCopy.shoppingListReady('pt', { itemCount: 5 });
      expect(out.title.toLowerCase()).toContain('compras');
      expect(out.body).toContain('5');
    });

    it('falls back pt-BR → pt', () => {
      const out = pushCopy.shoppingListReady('pt-BR', { itemCount: 5 });
      expect(out.title.toLowerCase()).toContain('compras');
    });

    it('falls back unknown locale → en', () => {
      const out = pushCopy.shoppingListReady('jp-JP', { itemCount: 2 });
      expect(out.title).toBe('Your shopping list is ready');
    });
  });

  describe('mealPlanReady', () => {
    it('renders in en/es/pt', () => {
      const en = pushCopy.mealPlanReady('en');
      const es = pushCopy.mealPlanReady('es');
      const pt = pushCopy.mealPlanReady('pt');

      expect(en.title).toMatch(/meal plan/i);
      expect(es.title.toLowerCase()).toMatch(/plan|comidas/);
      expect(pt.title.toLowerCase()).toMatch(/plano|refeições/);
    });
  });

  describe('planReminder', () => {
    it('renders in en/es/pt', () => {
      const en = pushCopy.planReminder('en');
      const es = pushCopy.planReminder('es');
      const pt = pushCopy.planReminder('pt');
      // English copy uses 'Plan your week?'
      expect(en.title).toMatch(/plan/i);
      // Spanish + Portuguese both reference week ('semana')
      expect(es.body.toLowerCase()).toContain('semana');
      expect(pt.body.toLowerCase()).toContain('semana');
    });
  });

  describe('expiringSoon', () => {
    it('uses singular form when titles.length === 1', () => {
      const out = pushCopy.expiringSoon('en', { titles: ['Lentil Stew'] });
      expect(out.body).toContain('Lentil Stew');
      expect(out.body).toMatch(/expires/i);
    });

    it('uses plural form when titles.length > 1', () => {
      const out = pushCopy.expiringSoon('en', {
        titles: ['Stew', 'Soup', 'Curry'],
      });
      expect(out.body).toContain('3');
      expect(out.body).not.toContain('Stew');
    });

    it('renders Spanish singular + plural', () => {
      const sing = pushCopy.expiringSoon('es', { titles: ['Pozole'] });
      const plur = pushCopy.expiringSoon('es', {
        titles: ['Pozole', 'Tinga', 'Tacos'],
      });
      expect(sing.body).toContain('Pozole');
      expect(plur.body).toContain('3');
    });

    it('renders Portuguese singular + plural', () => {
      const sing = pushCopy.expiringSoon('pt', { titles: ['Feijoada'] });
      const plur = pushCopy.expiringSoon('pt', {
        titles: ['Feijoada', 'Moqueca', 'Brigadeiro'],
      });
      expect(sing.body).toContain('Feijoada');
      expect(plur.body).toContain('3');
    });
  });

  describe('weeklyDigest', () => {
    it('en singular meal vs plural meals', () => {
      const sing = pushCopy.weeklyDigest('en', { activityCount: 1 });
      const plur = pushCopy.weeklyDigest('en', { activityCount: 5 });
      expect(sing.body).toContain('1 meal ');
      expect(plur.body).toContain('5 meals');
    });

    it('es renders with comida/comidas', () => {
      const sing = pushCopy.weeklyDigest('es', { activityCount: 1 });
      const plur = pushCopy.weeklyDigest('es', { activityCount: 4 });
      expect(sing.body).toMatch(/1 comida\b/);
      expect(plur.body).toMatch(/4 comidas\b/);
    });

    it('pt renders with refeição/refeições', () => {
      const sing = pushCopy.weeklyDigest('pt', { activityCount: 1 });
      const plur = pushCopy.weeklyDigest('pt', { activityCount: 6 });
      expect(sing.body).toMatch(/1 refeição\b/);
      expect(plur.body).toMatch(/6 refeições\b/);
    });
  });

  describe('coachWeeklyCheckin', () => {
    it('renders title only (body comes from caller)', () => {
      const en = pushCopy.coachWeeklyCheckin('en');
      const es = pushCopy.coachWeeklyCheckin('es');
      const pt = pushCopy.coachWeeklyCheckin('pt');
      expect(en.title).toMatch(/check-in/i);
      expect(es.title.toLowerCase()).toMatch(/saludo|hola|cómo|tal/);
      expect(pt.title.toLowerCase()).toMatch(/oi|olá|tudo|como/);
    });
  });

  describe('TEMPLATE_IDS', () => {
    it('exports a stable list of every template id', () => {
      const expected: PushTemplateId[] = [
        'shoppingListReady',
        'mealPlanReady',
        'planReminder',
        'expiringSoon',
        'weeklyDigest',
        'coachWeeklyCheckin',
      ];
      expect([...TEMPLATE_IDS].sort()).toEqual(expected.sort());
    });
  });
});

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

    it('personalizes the title with the day name when provided', () => {
      const out = pushCopy.shoppingListReady('en', {
        itemCount: 14,
        dayName: 'Tuesday',
      });
      expect(out.title).toBe("Tuesday's list");
    });

    it('personalizes the body with the dominant category when provided', () => {
      const out = pushCopy.shoppingListReady('en', {
        itemCount: 14,
        dominantCategory: 'Produce',
      });
      expect(out.body).toContain('mostly produce');
    });

    it('renders the fully-personalized "Tuesday\'s list — 14 items, mostly produce" preview', () => {
      const out = pushCopy.shoppingListReady('en', {
        itemCount: 14,
        dayName: 'Tuesday',
        dominantCategory: 'Produce',
      });
      expect(out.title).toBe("Tuesday's list");
      expect(out.body).toContain('14 items');
      expect(out.body).toContain('mostly produce');
    });

    it('personalized variants localize in Spanish + Portuguese + French', () => {
      const es = pushCopy.shoppingListReady('es', {
        itemCount: 14,
        dayName: 'Martes',
        dominantCategory: 'Frutas',
      });
      expect(es.title.toLowerCase()).toContain('martes');
      expect(es.body).toContain('14');
      expect(es.body.toLowerCase()).toContain('frutas');

      const pt = pushCopy.shoppingListReady('pt-BR', {
        itemCount: 9,
        dayName: 'Terça',
        dominantCategory: 'Vegetais',
      });
      expect(pt.title.toLowerCase()).toContain('terça');
      expect(pt.body.toLowerCase()).toContain('vegetais');

      const fr = pushCopy.shoppingListReady('fr', {
        itemCount: 5,
        dominantCategory: 'Légumes',
      });
      expect(fr.body.toLowerCase()).toContain('légumes');
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

      expect(en.title).toMatch(/plan/i);
      expect(es.title.toLowerCase()).toMatch(/plan|comidas/);
      expect(pt.title.toLowerCase()).toMatch(/plano|refeições/);
    });

    it('personalizes body with day + cuisine counts when provided', () => {
      const out = pushCopy.mealPlanReady('en', { dayCount: 7, cuisineCount: 5 });
      expect(out.body).toContain('7 meals');
      expect(out.body).toContain('5 cuisines');
    });

    it('omits personalization gracefully when counts are missing', () => {
      const out = pushCopy.mealPlanReady('en', {});
      expect(out.body).toMatch(/week at a glance/i);
    });

    it('singularizes cuisine label at cuisineCount=1', () => {
      const out = pushCopy.mealPlanReady('en', { dayCount: 7, cuisineCount: 1 });
      expect(out.body).toContain('1 cuisine');
      expect(out.body).not.toContain('cuisines');
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

    it('weaves topCuisine into the preview when provided', () => {
      const out = pushCopy.weeklyDigest('en', {
        activityCount: 7,
        topCuisine: 'Persian',
      });
      expect(out.body).toContain('7 meals');
      expect(out.body).toContain('mostly Persian');
    });

    it('falls back to the generic body when topCuisine is omitted', () => {
      const out = pushCopy.weeklyDigest('en', { activityCount: 3 });
      expect(out.body).toMatch(/Tap for your summary/);
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

  // ─── French (Tier I1B.3) ─────────────────────────────────────────────
  describe('French (fr, fr-CA)', () => {
    it('shoppingListReady renders in French base with article/articles plural', () => {
      const sing = pushCopy.shoppingListReady('fr', { itemCount: 1 });
      const plur = pushCopy.shoppingListReady('fr', { itemCount: 9 });
      expect(sing.title.toLowerCase()).toMatch(/courses|liste/);
      expect(sing.body).toMatch(/1 article\b/);
      expect(plur.body).toMatch(/9 articles\b/);
    });

    it('shoppingListReady falls back fr-CA → fr', () => {
      const out = pushCopy.shoppingListReady('fr-CA', { itemCount: 4 });
      expect(out.title.toLowerCase()).toMatch(/courses|liste/);
      expect(out.body).toContain('4');
    });

    it('mealPlanReady renders in French', () => {
      const out = pushCopy.mealPlanReady('fr');
      expect(out.title.toLowerCase()).toMatch(/menu|plan/);
    });

    it('planReminder body references the week (semaine) in French', () => {
      const out = pushCopy.planReminder('fr');
      expect(out.body.toLowerCase()).toContain('semaine');
    });

    it('expiringSoon renders French singular + plural', () => {
      const sing = pushCopy.expiringSoon('fr', { titles: ['Ratatouille'] });
      const plur = pushCopy.expiringSoon('fr', {
        titles: ['Ratatouille', 'Cassoulet', 'Tartiflette'],
      });
      expect(sing.body).toContain('Ratatouille');
      expect(sing.body.toLowerCase()).toMatch(/expire|bientôt|périme/);
      expect(plur.body).toContain('3');
    });

    it('weeklyDigest renders with repas (invariable singular/plural in French)', () => {
      // "repas" is the same in singular and plural — French quirk. Both
      // "1 repas" and "5 repas" are correct; the test verifies we don't
      // accidentally emit "repass" or "repases".
      const sing = pushCopy.weeklyDigest('fr', { activityCount: 1 });
      const plur = pushCopy.weeklyDigest('fr', { activityCount: 5 });
      expect(sing.body).toMatch(/1 repas\b/);
      expect(plur.body).toMatch(/5 repas\b/);
      expect(sing.body).not.toMatch(/repass|repases/);
    });

    it('coachWeeklyCheckin renders informal French greeting', () => {
      const out = pushCopy.coachWeeklyCheckin('fr');
      expect(out.title.toLowerCase()).toMatch(/salut|coucou|ça va|alors/);
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
        'preDinnerNudge',
        'cuisineDrought',
        'lapsedDay3',
        'lapsedDay7',
      ];
      expect([...TEMPLATE_IDS].sort()).toEqual(expected.sort());
    });
  });

  describe('preDinnerNudge', () => {
    it('renders an en payload with cuisine + optional dish hint', () => {
      const p = pushCopy.preDinnerNudge('en', { suggestedCuisine: 'Persian', dishHint: 'fesenjan' });
      expect(p.title).toBe("What's cooking?");
      expect(p.body).toContain('Persian');
      expect(p.body).toContain('fesenjan');
    });

    it('falls back gracefully without dishHint', () => {
      const p = pushCopy.preDinnerNudge('en', { suggestedCuisine: 'Yucatecan' });
      expect(p.body).toContain('Yucatecan');
      expect(p.body).not.toContain('undefined');
    });

    it('localizes for es-MX → es', () => {
      const p = pushCopy.preDinnerNudge('es-MX', { suggestedCuisine: 'Coreano' });
      expect(p.title).toBe('¿Qué se cocina?');
      expect(p.body.toLowerCase()).toContain('coreano');
    });
  });

  describe('cuisineDrought', () => {
    it('reads as a curious nudge, not a verdict', () => {
      const p = pushCopy.cuisineDrought('en', { cuisine: 'Persian', daysSince: 9 });
      expect(p.title).toBe('Persian has been quiet');
      expect(p.body).toContain('9 days');
      // Never use banned vocab in drought push
      expect(p.body.toLowerCase()).not.toMatch(/should|need to|don't forget/);
    });

    it('localizes the drought copy for pt', () => {
      const p = pushCopy.cuisineDrought('pt-BR', { cuisine: 'Persa', daysSince: 12 });
      expect(p.title).toContain('Persa');
      expect(p.body).toContain('12');
    });
  });

  describe('lapsedDay3 / lapsedDay7', () => {
    it('uses topCuisine as the re-entry hook (day 3)', () => {
      const p = pushCopy.lapsedDay3('en', { topCuisine: 'Italian' });
      expect(p.title).toBe('Sazon missed you');
      expect(p.body).toContain('Italian');
    });

    it('uses topCuisine as the re-entry hook (day 7)', () => {
      const p = pushCopy.lapsedDay7('en', { topCuisine: 'Thai' });
      expect(p.title).toContain("hasn't seen you");
      expect(p.body).toContain('Thai');
    });

    it('never uses streak-guilt or scarcity in lapsed copy', () => {
      const p3 = pushCopy.lapsedDay3('en', { topCuisine: 'Italian' });
      const p7 = pushCopy.lapsedDay7('en', { topCuisine: 'Italian' });
      const all = `${p3.title}${p3.body}${p7.title}${p7.body}`.toLowerCase();
      expect(all).not.toMatch(/streak|don't lose|miss out|last chance|hurry|only \d+ left/);
    });
  });
});

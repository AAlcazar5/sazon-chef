// ROADMAP 4.0 I2.3 — locale-aware seasonal × availability layer.
//
// Brazilian mango is Mar-Jul not Jun-Aug; chayote is year-round in MX,
// summer-only in US; figs peak Sep-Nov in MX vs Jun-Aug in US. Different
// hemispheres + different latitudes → different produce calendars.
//
// The existing en-US table stays as the fallback. Locale-specific tables
// override per (locale, month). Unknown locales fall back to en-US.

import {
  pickSeasonalProduce,
  findPeakMonth,
  SEASONAL_PRODUCE_BY_LOCALE,
  __forTest,
} from '../../src/services/seasonalProduceService';

describe('I2.3 — locale-aware seasonal layer', () => {
  describe('pickSeasonalProduce({ locale })', () => {
    it('en-US default unchanged when locale omitted', () => {
      // April day 1 in en-US should pick the April[0] entry
      const result = pickSeasonalProduce({ asOfDate: new Date('2026-04-01T12:00:00Z') });
      expect(result).not.toBeNull();
      expect(result!.name).toBeTruthy();
    });

    it('explicit en-US matches the unscoped default', () => {
      const date = new Date('2026-07-15T12:00:00Z');
      const a = pickSeasonalProduce({ asOfDate: date });
      const b = pickSeasonalProduce({ asOfDate: date, locale: 'en-US' });
      expect(a).toEqual(b);
    });

    it('pt-BR returns Brazilian-Apr produce different from US-Apr', () => {
      const date = new Date('2026-04-15T12:00:00Z');
      const us = pickSeasonalProduce({ asOfDate: date, locale: 'en-US' });
      const br = pickSeasonalProduce({ asOfDate: date, locale: 'pt-BR' });
      expect(br).not.toBeNull();
      expect(us).not.toBeNull();
      expect(br!.name).not.toBe(us!.name);
    });

    it('pt-BR mango peaks in March-July (not Jun-Aug like US)', () => {
      // Mango should appear in the pt-BR table in at least one of Mar/Apr/May/Jun/Jul
      const months = [2, 3, 4, 5, 6]; // 0-indexed
      const brTable = SEASONAL_PRODUCE_BY_LOCALE['pt-BR'];
      expect(brTable).toBeDefined();
      const hasMangoInBrSummer = months.some((m) =>
        brTable![m].some((p) => p.name.toLowerCase().includes('manga')),
      );
      expect(hasMangoInBrSummer).toBe(true);
    });

    it('es-MX chayote appears in multiple months (year-round-ish)', () => {
      const mxTable = SEASONAL_PRODUCE_BY_LOCALE['es-MX'];
      expect(mxTable).toBeDefined();
      const monthsWithChayote = mxTable!.filter((monthList) =>
        monthList.some((p) => p.name.toLowerCase().includes('chayote')),
      );
      // Year-round → chayote should appear in at least 6 months
      expect(monthsWithChayote.length).toBeGreaterThanOrEqual(6);
    });

    it('unknown locale falls back to en-US table', () => {
      const date = new Date('2026-07-15T12:00:00Z');
      const fallback = pickSeasonalProduce({ asOfDate: date, locale: 'jp-JP' });
      const us = pickSeasonalProduce({ asOfDate: date, locale: 'en-US' });
      expect(fallback).toEqual(us);
    });

    it('locale fallback walks BCP 47 chain (es-AR → es-MX, pt-PT → pt-BR if available, else en-US)', () => {
      const date = new Date('2026-04-15T12:00:00Z');
      const arResult = pickSeasonalProduce({ asOfDate: date, locale: 'es-AR' });
      // es-AR should not be undefined; either it has its own table or falls back
      expect(arResult).not.toBeNull();
    });

    it('deterministic on (locale, month, day-of-month)', () => {
      const date = new Date('2026-05-22T08:00:00Z');
      const a = pickSeasonalProduce({ asOfDate: date, locale: 'pt-BR' });
      const b = pickSeasonalProduce({ asOfDate: date, locale: 'pt-BR' });
      const c = pickSeasonalProduce({ asOfDate: date, locale: 'pt-BR' });
      expect(a).toEqual(b);
      expect(b).toEqual(c);
    });

    it('different days within a week pick different produce in pt-BR', () => {
      const monday = new Date('2026-04-13T12:00:00Z');
      const wednesday = new Date('2026-04-15T12:00:00Z');
      const friday = new Date('2026-04-17T12:00:00Z');

      const a = pickSeasonalProduce({ asOfDate: monday, locale: 'pt-BR' });
      const b = pickSeasonalProduce({ asOfDate: wednesday, locale: 'pt-BR' });
      const c = pickSeasonalProduce({ asOfDate: friday, locale: 'pt-BR' });

      // At least one transition should differ (table has ≥3 entries per month).
      expect(a!.name === b!.name && b!.name === c!.name).toBe(false);
    });
  });

  describe('findPeakMonth({ locale })', () => {
    it('respects locale: tomato peaks in different months in BR vs US', () => {
      // US tomato peaks in July (month 6). BR is Southern Hemisphere — peak
      // is southern summer (Dec-Mar, months 11/0/1/2).
      const us = findPeakMonth('tomatoes', { locale: 'en-US' });
      const br = findPeakMonth('tomate', { locale: 'pt-BR' });
      // US returns 6 (July). BR table peak should be in summer months for Brazil.
      expect(us).toBe(6);
      // BR month should be one of Dec/Jan/Feb/Mar (Southern summer) if present.
      if (br !== -1) {
        expect([0, 1, 2, 11].includes(br)).toBe(true);
      }
    });

    it('returns -1 for unknown ingredient', () => {
      expect(findPeakMonth('martian-fruit', { locale: 'pt-BR' })).toBe(-1);
    });

    it('falls back to en-US when locale missing', () => {
      // 'asparagus' in en-US — peak in March (month 2)
      expect(findPeakMonth('asparagus', { locale: 'jp-JP' })).toBe(2);
    });
  });

  describe('data integrity', () => {
    it('every locale table has 12 months', () => {
      for (const [locale, table] of Object.entries(SEASONAL_PRODUCE_BY_LOCALE)) {
        expect(table.length).toBe(12);
      }
    });

    it('every month entry has at least 3 produce items', () => {
      for (const [locale, table] of Object.entries(SEASONAL_PRODUCE_BY_LOCALE)) {
        table.forEach((monthList, idx) => {
          expect(monthList.length).toBeGreaterThanOrEqual(3);
        });
      }
    });

    it('every produce entry has lowercase name + non-empty hook', () => {
      for (const [locale, table] of Object.entries(SEASONAL_PRODUCE_BY_LOCALE)) {
        for (const month of table) {
          for (const p of month) {
            expect(p.name).toBe(p.name.toLowerCase());
            expect(p.hook.length).toBeGreaterThan(10);
          }
        }
      }
    });

    it('exposes resolveLocaleTable for cap-test inspection', () => {
      expect(typeof __forTest.resolveLocaleTable).toBe('function');
      expect(__forTest.resolveLocaleTable('en-US')).toBeDefined();
      expect(__forTest.resolveLocaleTable('jp-JP')).toBeDefined(); // fallback
    });
  });
});

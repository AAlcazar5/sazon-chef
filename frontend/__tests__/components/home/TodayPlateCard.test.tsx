// BAP1.1: TodayPlateCard — variant render tests.

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TodayPlateCard, { ctaLabelFor } from '../../../components/home/TodayPlateCard';
import type { TodayPlateContext } from '../../../hooks/useTodayPlateContext';
import type {
  LeftoverInventoryItem,
  PermutationCandidate,
} from '../../../lib/api';

const baseLeftover: LeftoverInventoryItem = {
  id: 'l1',
  componentId: 'c1',
  slot: 'protein',
  name: 'roast chicken',
  portionsRemaining: 1,
};

const basePantryPlate: PermutationCandidate = {
  id: 'p1',
  components: [
    {
      slot: 'protein',
      component: {
        id: 'c1',
        slot: 'protein',
        name: 'chicken',
        caloriesPerPortion: 200,
        proteinG: 30,
        carbsG: 0,
        fatG: 8,
        cuisine: 'mediterranean',
        prepStyle: 'roast',
        portionSize: 100,
        portionUnit: 'g',
        ingredients: [],
        pantryCoveragePercent: 100,
      } as unknown as PermutationCandidate['components'][0]['component'],
      portionMultiplier: 1,
    },
    {
      slot: 'base',
      component: {
        id: 'c2',
        slot: 'base',
        name: 'rice',
        caloriesPerPortion: 150,
        proteinG: 3,
        carbsG: 30,
        fatG: 1,
        cuisine: 'mediterranean',
        prepStyle: 'steamed',
        portionSize: 100,
        portionUnit: 'g',
        ingredients: [],
        pantryCoveragePercent: 100,
      } as unknown as PermutationCandidate['components'][0]['component'],
      portionMultiplier: 1,
    },
  ],
  coherenceScore: 0.8,
  pantryCoveragePercent: 75,
  macroFitScore: 0.7,
};

const ctx = (variant: TodayPlateContext['variant'], overrides?: Partial<TodayPlateContext>): TodayPlateContext => ({
  variant,
  leftovers: variant === 'leftover' ? [baseLeftover, { ...baseLeftover, id: 'l2', slot: 'base', name: 'rice' }] : [],
  pantryPlate: variant === 'pantry' ? basePantryPlate : null,
  weekPlate:
    variant === 'plateOfWeek'
      ? {
          id: 'w1',
          title: 'Sunday Bowls',
          totalCalories: 580,
          totalProtein: 32,
          totalCarbs: 60,
          totalFat: 14,
        }
      : null,
  isLoading: false,
  ...overrides,
});

describe('BAP1.1: TodayPlateCard', () => {
  it('renders the leftover variant with carry-on eyebrow + item names', () => {
    render(<TodayPlateCard context={ctx('leftover')} />);
    expect(screen.getByTestId('today-plate-card-leftover')).toBeTruthy();
    expect(screen.getByText('CARRY ON')).toBeTruthy();
    expect(screen.getByText(/2 pieces still waiting/)).toBeTruthy();
    expect(screen.getByText(/roast chicken/)).toBeTruthy();
  });

  it('renders the pantry variant with macro line + pantry-coverage hint', () => {
    render(<TodayPlateCard context={ctx('pantry')} />);
    expect(screen.getByTestId('today-plate-card-pantry')).toBeTruthy();
    expect(screen.getByText('TONIGHT')).toBeTruthy();
    // Macro line shows calories + protein + coverage match.
    expect(screen.getByText(/350 cal · 33g pro · 75% match/)).toBeTruthy();
  });

  it('renders the plate-of-week variant as the cold-start fallback when no personal signal', () => {
    render(<TodayPlateCard context={ctx('plateOfWeek')} />);
    expect(screen.getByTestId('today-plate-card-plate-of-week')).toBeTruthy();
    expect(screen.getByText('THIS WEEK')).toBeTruthy();
    expect(screen.getByText('Sunday Bowls')).toBeTruthy();
  });

  it('renders the cold-start variant with the BUILD eyebrow + Sazon-voice CTA hint', () => {
    render(<TodayPlateCard context={ctx('coldStart')} />);
    expect(screen.getByTestId('today-plate-card-cold-start')).toBeTruthy();
    expect(screen.getByText('BUILD')).toBeTruthy();
    expect(screen.getByText(/Pick a protein, a base, a vegetable/)).toBeTruthy();
    // Cold-start renders the "Takes about a minute" hint that's
    // suppressed on other variants.
    expect(screen.getByText('Takes about a minute')).toBeTruthy();
  });

  it('slot icons render for variants that carry slot data', () => {
    const { rerender } = render(<TodayPlateCard context={ctx('pantry')} />);
    expect(screen.getByTestId('today-plate-slot-row')).toBeTruthy();

    rerender(<TodayPlateCard context={ctx('coldStart')} />);
    // Cold-start has no slot data — row hidden.
    expect(screen.queryByTestId('today-plate-slot-row')).toBeNull();
  });

  describe('ctaLabelFor', () => {
    it('returns a variant-appropriate CTA string for every variant', () => {
      expect(ctaLabelFor('leftover')).toMatch(/Stretch/i);
      expect(ctaLabelFor('pantry')).toMatch(/Open in Build-a-Plate/i);
      expect(ctaLabelFor('plateOfWeek')).toMatch(/Open in Build-a-Plate/i);
      expect(ctaLabelFor('coldStart')).toMatch(/Start/i);
    });

    it('every CTA passes the banned-vocabulary check (no cut/bulk/maintain/macro-friendly)', () => {
      const variants: Array<Parameters<typeof ctaLabelFor>[0]> = [
        'leftover',
        'pantry',
        'plateOfWeek',
        'coldStart',
      ];
      for (const v of variants) {
        const label = ctaLabelFor(v);
        expect(label).not.toMatch(/\b(cut|bulk|maintain|macro-friendly)\b/i);
      }
    });
  });
});

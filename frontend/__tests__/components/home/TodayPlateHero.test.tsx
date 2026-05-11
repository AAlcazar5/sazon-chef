// BAP0.1: TodayPlateHero — render + CTA wiring tests.

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Jest hoists the factory; vars prefixed with `mock` are accessible inside.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub the data hooks — TodayPlateHero only consumes useTodayPlateContext,
// but the hero falls through to live data when no override is passed.
jest.mock('../../../hooks/useTodayPlateContext', () => {
  const actual = jest.requireActual('../../../hooks/useTodayPlateContext');
  return {
    ...actual,
    useTodayPlateContext: () => ({
      variant: 'coldStart',
      leftovers: [],
      pantryPlate: null,
      weekPlate: null,
      isLoading: false,
    }),
  };
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import TodayPlateHero from '../../../components/home/TodayPlateHero';
import type { TodayPlateContext } from '../../../hooks/useTodayPlateContext';

beforeEach(() => {
  mockPush.mockClear();
});

// Animated mount has a spring; advance fake timers to ensure render
// stability for assertions that read post-mount state.
function renderHero(props?: Parameters<typeof TodayPlateHero>[0]) {
  const result = render(<TodayPlateHero {...props} />);
  act(() => {
    // Let any Animated.timing/spring complete synchronously for tests.
  });
  return result;
}

describe('BAP0.1: TodayPlateHero', () => {
  it('renders the hero wrapper + CTA on cold-start (default)', () => {
    renderHero();
    expect(screen.getByTestId('today-plate-hero')).toBeTruthy();
    expect(screen.getByTestId('today-plate-hero-cta')).toBeTruthy();
    expect(screen.getByTestId('today-plate-card-cold-start')).toBeTruthy();
  });

  it('cold-start CTA pushes /build-a-plate with seedFromToday', () => {
    renderHero();
    fireEvent.press(screen.getByTestId('today-plate-hero-cta'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/build-a-plate',
        params: expect.objectContaining({ seedFromToday: 'true' }),
      }),
    );
  });

  it('pantry variant CTA pushes with pantryOnly + preset id', () => {
    const ctx: TodayPlateContext = {
      variant: 'pantry',
      leftovers: [],
      pantryPlate: {
        id: 'plate-xyz',
        components: [],
        coherenceScore: 0.8,
        pantryCoveragePercent: 80,
        macroFitScore: 0.7,
      },
      weekPlate: null,
      isLoading: false,
    };
    renderHero({ contextOverride: ctx });
    fireEvent.press(screen.getByTestId('today-plate-hero-cta'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/build-a-plate',
        params: { pantryOnly: 'true', preset: 'plate-xyz' },
      }),
    );
  });

  it('leftover variant CTA pushes with pantryOnly (stretch flow)', () => {
    const ctx: TodayPlateContext = {
      variant: 'leftover',
      leftovers: [
        { id: 'l1', componentId: 'c1', slot: 'protein', name: 'chicken', portionsRemaining: 1 },
        { id: 'l2', componentId: 'c2', slot: 'base', name: 'rice', portionsRemaining: 1 },
      ],
      pantryPlate: null,
      weekPlate: null,
      isLoading: false,
    };
    renderHero({ contextOverride: ctx });
    fireEvent.press(screen.getByTestId('today-plate-hero-cta'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/build-a-plate',
        params: { pantryOnly: 'true' },
      }),
    );
  });

  it('plateOfWeek variant CTA pushes with plateId', () => {
    const ctx: TodayPlateContext = {
      variant: 'plateOfWeek',
      leftovers: [],
      pantryPlate: null,
      weekPlate: {
        id: 'w1',
        title: 'Sunday Bowls',
        totalCalories: 580,
        totalProtein: 32,
        totalCarbs: 60,
        totalFat: 14,
      },
      isLoading: false,
    };
    renderHero({ contextOverride: ctx });
    fireEvent.press(screen.getByTestId('today-plate-hero-cta'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/build-a-plate',
        params: { plateId: 'w1' },
      }),
    );
  });

  it('renders nothing while isLoading=true to avoid the cold-start flicker', () => {
    const ctx: TodayPlateContext = {
      variant: 'coldStart',
      leftovers: [],
      pantryPlate: null,
      weekPlate: null,
      isLoading: true,
    };
    renderHero({ contextOverride: ctx });
    expect(screen.queryByTestId('today-plate-hero')).toBeNull();
  });

  it('rationale ribbon renders below the hero when a rationale is provided', () => {
    renderHero({
      rationale: {
        primaryReason: 'Your pantry already covers 4 of 5 slots.',
        secondaryReasons: ['Fits tonight\'s macro target', 'Matches your cuisine cadence'],
      },
    });
    expect(screen.getByTestId('hero-rationale-ribbon')).toBeTruthy();
  });

  it('rationale ribbon hides when no rationale is provided', () => {
    renderHero();
    expect(screen.queryByTestId('hero-rationale-ribbon')).toBeNull();
  });
});

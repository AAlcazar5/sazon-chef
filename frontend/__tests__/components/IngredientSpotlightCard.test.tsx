// frontend/__tests__/components/IngredientSpotlightCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import IngredientSpotlightCard from '../../components/home/IngredientSpotlightCard';
import { getWeeklySpotlight, INGREDIENT_SPOTLIGHTS } from '../../constants/IngredientSpotlights';

describe('IngredientSpotlightCard', () => {
  const onSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current week spotlight ingredient', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    const spotlight = getWeeklySpotlight();
    expect(screen.getByText(spotlight.ingredient)).toBeTruthy();
  });

  it('renders the tagline', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    const spotlight = getWeeklySpotlight();
    expect(screen.getByText(spotlight.tagline)).toBeTruthy();
  });

  it('shows "This Week" header', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    expect(screen.getByText('This Week')).toBeTruthy();
  });

  it('shows "See recipes" CTA', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    expect(screen.getByText('See recipes')).toBeTruthy();
  });

  it('calls onSearch with the searchFilter on tap', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    const spotlight = getWeeklySpotlight();
    fireEvent.press(screen.getByText('See recipes'));
    expect(onSearch).toHaveBeenCalledWith(spotlight.searchFilter);
  });

  it('has accessibility label with ingredient name', () => {
    render(<IngredientSpotlightCard onSearch={onSearch} />);
    const spotlight = getWeeklySpotlight();
    expect(screen.getByLabelText(`This week's ingredient: ${spotlight.ingredient}`)).toBeTruthy();
  });
});

describe('getWeeklySpotlight', () => {
  it('returns an ingredient spotlight object', () => {
    const spotlight = getWeeklySpotlight();
    expect(spotlight).toHaveProperty('ingredient');
    expect(spotlight).toHaveProperty('tagline');
    expect(spotlight).toHaveProperty('searchFilter');
  });

  it('is deterministic (same result on same day)', () => {
    const a = getWeeklySpotlight();
    const b = getWeeklySpotlight();
    expect(a.ingredient).toBe(b.ingredient);
  });

  it('returns a value from the INGREDIENT_SPOTLIGHTS array', () => {
    const spotlight = getWeeklySpotlight();
    const match = INGREDIENT_SPOTLIGHTS.find(s => s.ingredient === spotlight.ingredient);
    expect(match).toBeDefined();
  });
});

describe('INGREDIENT_SPOTLIGHTS data', () => {
  it('has 52 entries (one per week)', () => {
    expect(INGREDIENT_SPOTLIGHTS.length).toBeGreaterThanOrEqual(52);
  });

  it('has fiber/omega-3 tagged entries', () => {
    const fiberCount = INGREDIENT_SPOTLIGHTS.filter(s => s.fiberHighlight).length;
    const omega3Count = INGREDIENT_SPOTLIGHTS.filter(s => s.omega3Highlight).length;
    expect(fiberCount).toBeGreaterThanOrEqual(8);
    expect(omega3Count).toBeGreaterThanOrEqual(4);
  });

  it('every entry has required fields', () => {
    INGREDIENT_SPOTLIGHTS.forEach(s => {
      expect(s.ingredient).toBeTruthy();
      expect(s.tagline).toBeTruthy();
      expect(s.searchFilter).toBeTruthy();
    });
  });
});

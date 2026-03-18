// frontend/__tests__/components/MicronutrientSheet.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import MicronutrientSheet from '../../components/recipe/MicronutrientSheet';
import { MICRONUTRIENTS, FIBER_BADGE_MIN_GRAMS } from '../../constants/MicronutrientAnnotations';

describe('MicronutrientSheet', () => {
  const sampleNutrition = {
    fiber: 8.5,
    omega3: 0.4,
    magnesium: 120,
    vitaminD: 5,
    potassium: 800,
    iron: 4.5,
    folate: 100,
  };

  const defaultProps = {
    visible: true,
    nutrition: sampleNutrition,
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "Micronutrients" header', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    expect(screen.getByText('Micronutrients')).toBeTruthy();
  });

  it('renders all 7 micronutrient rows', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    MICRONUTRIENTS.forEach(micro => {
      expect(screen.getByText(micro.name)).toBeTruthy();
    });
  });

  it('shows percentage of daily value for fiber', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    // 8.5 / 28 * 100 = 30%
    expect(screen.getByText('30%')).toBeTruthy();
  });

  it('shows amount with units', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    // fiber: 8.5g
    expect(screen.getByText('(8.5g)')).toBeTruthy();
  });

  it('shows "why it matters" annotations', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    expect(screen.getByText(/gut bacteria/i)).toBeTruthy();
    expect(screen.getByText(/Anti-inflammatory/i)).toBeTruthy();
  });

  it('shows 0% for missing nutrient data', () => {
    const emptyNutrition = {};
    render(<MicronutrientSheet {...defaultProps} nutrition={emptyNutrition} />);
    // All should show 0%
    const zeroPercents = screen.getAllByText('0%');
    expect(zeroPercents.length).toBe(7);
  });

  it('shows subtitle about per serving', () => {
    render(<MicronutrientSheet {...defaultProps} />);
    expect(screen.getByText(/Per serving/)).toBeTruthy();
  });
});

describe('MicronutrientAnnotations constants', () => {
  it('has 7 micronutrients in ranked order', () => {
    expect(MICRONUTRIENTS.length).toBe(7);
    expect(MICRONUTRIENTS[0].name).toBe('Fiber');
    expect(MICRONUTRIENTS[1].name).toBe('Omega-3 (ALA)');
  });

  it('each entry has required fields', () => {
    MICRONUTRIENTS.forEach(m => {
      expect(m.name).toBeTruthy();
      expect(m.key).toBeTruthy();
      expect(m.dailyValue).toBeGreaterThan(0);
      expect(m.unit).toBeTruthy();
      expect(m.annotation).toBeTruthy();
    });
  });

  it('FIBER_BADGE_MIN_GRAMS is 8', () => {
    expect(FIBER_BADGE_MIN_GRAMS).toBe(8);
  });
});

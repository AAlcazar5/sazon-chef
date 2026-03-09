// frontend/__tests__/components/NutritionProgressRing.test.tsx
// NutritionProgressRing — progress 0–100, out-of-range clamping, label display

import React from 'react';
import { render } from '@testing-library/react-native';
import NutritionProgressRing from '../../components/meal-plan/NutritionProgressRing';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NutritionProgressRing', () => {
  it('renders without crashing with progress=0', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={0} label="Calories" />
    );
    expect(getByTestId('nutrition-progress-ring')).toBeTruthy();
  });

  it('renders without crashing with progress=100', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={100} label="Protein" />
    );
    expect(getByTestId('nutrition-progress-ring')).toBeTruthy();
  });

  it('renders without crashing with progress=50', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={50} label="Carbs" />
    );
    expect(getByTestId('nutrition-progress-ring')).toBeTruthy();
  });

  it('shows the percentage label for progress=75', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={75} label="Fat" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('75%');
  });

  it('shows 0% for progress=0', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={0} label="Calories" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('0%');
  });

  it('shows 100% for progress=100', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={100} label="Calories" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('100%');
  });

  it('clamps progress above 100 to 100%', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={150} label="Protein" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('100%');
  });

  it('clamps negative progress to 0%', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={-50} label="Fat" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('0%');
  });

  it('clamps very large values (e.g. 9999) to 100%', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={9999} label="Carbs" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('100%');
  });

  it('shows the goal label text', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={60} label="Daily Calories" />
    );
    expect(getByTestId('progress-label').props.children).toBe('Daily Calories');
  });

  it('shows any arbitrary label text', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={40} label="Protein Goal" />
    );
    expect(getByTestId('progress-label').props.children).toBe('Protein Goal');
  });

  it('renders progress-fill with opacity 0 when progress=0', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={0} label="Fat" />
    );
    expect(getByTestId('progress-fill').props.style).toMatchObject({ opacity: 0 });
  });

  it('renders progress-fill with non-zero opacity when progress>0', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={50} label="Protein" />
    );
    const { opacity } = getByTestId('progress-fill').props.style;
    expect(opacity).toBeGreaterThan(0);
  });

  it('accepts a custom color prop without crashing', () => {
    const { toJSON } = render(
      <NutritionProgressRing progress={80} label="Carbs" color="#3B82F6" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders in dark mode without crashing', () => {
    const { toJSON } = render(
      <NutritionProgressRing progress={65} label="Calories" isDark={true} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('accepts a custom size prop without crashing', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={30} label="Fat" size={120} />
    );
    const ring = getByTestId('nutrition-progress-ring');
    expect(ring.props.style).toMatchObject({ width: 120, height: 120 });
  });

  it('rounds fractional progress to nearest integer', () => {
    const { getByTestId } = render(
      <NutritionProgressRing progress={33.7} label="Carbs" />
    );
    expect(getByTestId('progress-percent').props.children).toBe('34%');
  });
});

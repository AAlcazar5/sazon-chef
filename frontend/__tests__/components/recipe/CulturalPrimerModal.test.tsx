// frontend/__tests__/components/recipe/CulturalPrimerModal.test.tsx
// ROADMAP 4.0 Tier C10 frontend — CulturalPrimerModal (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CulturalPrimerModal from '../../../components/recipe/CulturalPrimerModal';

const samplePrimer = {
  title: 'Why Persian rice gets fluffed, not stirred',
  body: 'Saffron is the soul; tahdig (the crispy bottom) is the prize. Persian rice is steamed, not boiled.',
  nutritionalAngle:
    'Saffron is rich in manganese; barberries bring vitamin C; this kind of dish is quietly excellent for magnesium.',
};

describe('<CulturalPrimerModal />', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <CulturalPrimerModal visible={false} primer={samplePrimer} onDismiss={jest.fn()} />
    );
    expect(queryByTestId('cultural-primer-modal')).toBeNull();
  });

  it('renders nothing when primer is null', () => {
    const { queryByTestId } = render(
      <CulturalPrimerModal visible={true} primer={null} onDismiss={jest.fn()} />
    );
    expect(queryByTestId('cultural-primer-modal')).toBeNull();
  });

  it('renders title + body + nutritional angle when visible + primer present', () => {
    const { getByText } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={jest.fn()} />
    );
    expect(getByText(samplePrimer.title)).toBeTruthy();
    expect(getByText(samplePrimer.body)).toBeTruthy();
    expect(getByText(samplePrimer.nutritionalAngle)).toBeTruthy();
  });

  it('renders an eyebrow signaling first-cook context', () => {
    const { getByText } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={jest.fn()} />
    );
    expect(getByText(/FIRST TIME/i)).toBeTruthy();
  });

  it('fires onDismiss when the close button is tapped', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={onDismiss} />
    );
    fireEvent.press(getByTestId('cultural-primer-close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss when the "Got it" button is tapped', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={onDismiss} />
    );
    fireEvent.press(getByTestId('cultural-primer-acknowledge'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('separates cultural body and nutritional angle visually (two distinct sections)', () => {
    const { getByTestId } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={jest.fn()} />
    );
    expect(getByTestId('cultural-primer-cultural-section')).toBeTruthy();
    expect(getByTestId('cultural-primer-nutritional-section')).toBeTruthy();
  });

  it('exposes accessibilityRole="alert" so screen readers announce the primer', () => {
    const { getByTestId } = render(
      <CulturalPrimerModal visible={true} primer={samplePrimer} onDismiss={jest.fn()} />
    );
    const root = getByTestId('cultural-primer-modal');
    expect(root.props.accessibilityRole).toBe('alert');
  });
});

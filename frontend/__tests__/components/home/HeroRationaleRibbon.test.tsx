// ROADMAP 4.0 HX0.2 — HeroRationaleRibbon tests.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import HeroRationaleRibbon from '../../../components/home/HeroRationaleRibbon';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../lib/homeSurfaceEvents', () => ({
  logHomeSurfaceEvent: jest.fn(),
}));

describe('HeroRationaleRibbon (HX0.2)', () => {
  it('renders nothing when rationale is null', () => {
    const { queryByTestId } = renderWithProviders(<HeroRationaleRibbon rationale={null} />);
    expect(queryByTestId('hero-rationale-ribbon')).toBeNull();
  });

  it('renders nothing when rationale has empty primaryReason', () => {
    const { queryByTestId } = renderWithProviders(
      <HeroRationaleRibbon rationale={{ primaryReason: '', secondaryReasons: [] }} />,
    );
    expect(queryByTestId('hero-rationale-ribbon')).toBeNull();
  });

  it('renders the primary reason as a tappable italic ribbon', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <HeroRationaleRibbon
        rationale={{
          primaryReason: 'Leans into your magnesium stride for the week.',
          secondaryReasons: ['Rich in magnesium', 'New cuisine for you'],
        }}
      />,
    );
    expect(getByTestId('hero-rationale-ribbon')).toBeTruthy();
    expect(getByText('Leans into your magnesium stride for the week.')).toBeTruthy();
  });

  it('opens the sheet on tap and renders all secondary reasons', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <HeroRationaleRibbon
        rationale={{
          primaryReason: 'Uses cilantro — already in your pantry.',
          secondaryReasons: ['62% of ingredients on hand', 'Rich in iron', '3 friend cooks recently'],
        }}
      />,
    );
    expect(queryByTestId('hero-rationale-sheet')).toBeNull();
    fireEvent.press(getByTestId('hero-rationale-ribbon'));
    expect(getByTestId('hero-rationale-sheet')).toBeTruthy();
    expect(getByTestId('hero-rationale-secondary-0')).toBeTruthy();
    expect(getByTestId('hero-rationale-secondary-1')).toBeTruthy();
    expect(getByTestId('hero-rationale-secondary-2')).toBeTruthy();
  });
});

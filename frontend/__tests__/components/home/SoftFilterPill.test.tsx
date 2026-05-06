// frontend/__tests__/components/home/SoftFilterPill.test.tsx
// ROADMAP 4.0 FX3.1 — pill renders only when softFilterMode === true; tap fires onPress.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import SoftFilterPill from '../../../components/home/SoftFilterPill';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

describe('SoftFilterPill (FX3.1)', () => {
  it('renders nothing when softFilterMode is false', () => {
    const { queryByTestId } = renderWithProviders(
      <SoftFilterPill softFilterMode={false} onPress={jest.fn()} />,
    );
    expect(queryByTestId('soft-filter-pill')).toBeNull();
  });

  it('renders when softFilterMode is true', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <SoftFilterPill softFilterMode onPress={jest.fn()} />,
    );
    expect(getByTestId('soft-filter-pill')).toBeTruthy();
    expect(getByText('Showing closest matches')).toBeTruthy();
  });

  it('includes narrowedBy filter names in the sub-copy', () => {
    const { getByText } = renderWithProviders(
      <SoftFilterPill softFilterMode narrowedBy={['dietary', 'cookTime']} onPress={jest.fn()} />,
    );
    expect(getByText(/dietary \+ cookTime/i)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <SoftFilterPill softFilterMode onPress={onPress} />,
    );
    fireEvent.press(getByTestId('soft-filter-pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

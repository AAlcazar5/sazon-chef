// Phase 5 (10Y-E): PantryConfirmSheet — confirms identified ingredients
// and writes them into pantry via pantryApi.addMany.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockBrandButton(props: any) {
    return (
      <TouchableOpacity
        accessibilityLabel={props.accessibilityLabel ?? props.label}
        onPress={props.onPress}
        disabled={props.disabled}
      >
        <Text>{props.label}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const mockAddMany = jest.fn();
jest.mock('../../../lib/api', () => ({
  pantryApi: {
    addMany: (items: unknown) => mockAddMany(items),
  },
}));

const mockEmit = jest.fn();
jest.mock('../../../lib/coachAnalytics', () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

import PantryConfirmSheet from '../../../components/coach/PantryConfirmSheet';

const INGREDIENTS = [
  { name: 'chicken thigh', confidence: 0.92 },
  { name: 'broccoli', confidence: 0.81 },
  { name: 'lime', confidence: 0.7 },
];

describe('PantryConfirmSheet', () => {
  beforeEach(() => {
    mockAddMany.mockReset();
    mockAddMany.mockResolvedValue({ data: { items: [], count: 0 } });
    mockEmit.mockReset();
  });

  it('renders an entry per identified ingredient', () => {
    const { getByText } = render(
      <PantryConfirmSheet
        visible
        ingredients={INGREDIENTS}
        onClose={() => {}}
      />,
    );
    expect(getByText('chicken thigh')).toBeTruthy();
    expect(getByText('broccoli')).toBeTruthy();
    expect(getByText('lime')).toBeTruthy();
  });

  it('emits coach_pantry_confirm_view on open', () => {
    render(
      <PantryConfirmSheet
        visible
        ingredients={INGREDIENTS}
        onClose={() => {}}
      />,
    );
    expect(mockEmit).toHaveBeenCalledWith(
      'coach_pantry_confirm_view',
      expect.objectContaining({ count: 3 }),
    );
  });

  it('calls pantryApi.addMany with all checked items by default and emits accept event', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <PantryConfirmSheet
        visible
        ingredients={INGREDIENTS}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByLabelText('Add to pantry'));

    await waitFor(() => {
      expect(mockAddMany).toHaveBeenCalledTimes(1);
    });
    expect(mockAddMany).toHaveBeenCalledWith([
      { name: 'chicken thigh' },
      { name: 'broccoli' },
      { name: 'lime' },
    ]);
    expect(mockEmit).toHaveBeenCalledWith(
      'coach_pantry_confirm_accept',
      expect.objectContaining({ count: 3 }),
    );
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('omits unchecked items from the addMany call', async () => {
    const { getByLabelText } = render(
      <PantryConfirmSheet
        visible
        ingredients={INGREDIENTS}
        onClose={() => {}}
      />,
    );
    // Uncheck 'broccoli'
    fireEvent.press(getByLabelText('Uncheck broccoli'));
    fireEvent.press(getByLabelText('Add to pantry'));
    await waitFor(() => {
      expect(mockAddMany).toHaveBeenCalledTimes(1);
    });
    expect(mockAddMany).toHaveBeenCalledWith([
      { name: 'chicken thigh' },
      { name: 'lime' },
    ]);
  });

  it('closes via Skip without calling pantryApi', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <PantryConfirmSheet
        visible
        ingredients={INGREDIENTS}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Skip'));
    expect(mockAddMany).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

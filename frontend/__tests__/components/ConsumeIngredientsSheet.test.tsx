// frontend/__tests__/components/ConsumeIngredientsSheet.test.tsx
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, disabled, testID, style }: any) => (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('../../lib/api', () => ({
  pantryApi: {
    consume: jest.fn(() => Promise.resolve({ data: { consumed: [], unmatched: [] } })),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ConsumeIngredientsSheet from '../../components/cooking/ConsumeIngredientsSheet';
import { pantryApi } from '../../lib/api';

describe('ConsumeIngredientsSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renders all ingredients pre-checked', () => {
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['2 tomatoes', '1 onion', '3 cloves garlic']}
        onClose={() => {}}
      />,
    );
    expect(getByLabelText('2 tomatoes — selected')).toBeTruthy();
    expect(getByLabelText('1 onion — selected')).toBeTruthy();
    expect(getByLabelText('3 cloves garlic — selected')).toBeTruthy();
  });

  test('confirm POSTs checked ingredients to pantryApi.consume', async () => {
    const onClose = jest.fn();
    const onConsumed = jest.fn();
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['2 tomatoes', '1 onion']}
        onClose={onClose}
        onConsumed={onConsumed}
      />,
    );
    fireEvent.press(getByLabelText('Mark as used'));
    await waitFor(() => expect(pantryApi.consume).toHaveBeenCalled());
    expect(pantryApi.consume).toHaveBeenCalledWith(['2 tomatoes', '1 onion']);
    expect(onClose).toHaveBeenCalled();
    expect(onConsumed).toHaveBeenCalledWith({ consumed: [], unmatched: [] });
  });

  test('toggling an ingredient removes it from the consume payload', async () => {
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['2 tomatoes', '1 onion']}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByLabelText('1 onion — selected'));
    fireEvent.press(getByLabelText('Mark as used'));
    await waitFor(() => expect(pantryApi.consume).toHaveBeenCalled());
    expect(pantryApi.consume).toHaveBeenCalledWith(['2 tomatoes']);
  });

  test('Skip closes without calling API', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['tomatoes']}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Skip'));
    expect(onClose).toHaveBeenCalled();
    expect(pantryApi.consume).not.toHaveBeenCalled();
  });

  test('unchecking all ingredients disables the Mark button (no API call)', () => {
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['tomatoes']}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByLabelText('tomatoes — selected'));
    fireEvent.press(getByLabelText('Mark as used'));
    expect(pantryApi.consume).not.toHaveBeenCalled();
  });

  test('still closes on API failure (non-blocking)', async () => {
    (pantryApi.consume as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <ConsumeIngredientsSheet
        visible={true}
        ingredients={['tomatoes']}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Mark as used'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

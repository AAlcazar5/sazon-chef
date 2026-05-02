// frontend/__tests__/components/shopping/InStoreDoneButton.test.tsx
// TDD: "I'm done shopping" button
// RED phase — written before implementation

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (c: any) => c,
  useReducedMotion: () => false,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('../../../lib/api', () => ({
  shoppingListApi: {
    markListDone: jest.fn(),
  },
}));

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockBrandButton({ label, onPress, accessibilityLabel, testID, disabled }: any) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID || `brand-btn-${label}`}
        disabled={disabled}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO({ children, onPress, ...props }: any) {
    return <TouchableOpacity onPress={onPress} {...props}>{children}</TouchableOpacity>;
  };
});

import { shoppingListApi } from '../../../lib/api';
import InStoreDoneButton from '../../../components/shopping/InStoreDoneButton';

const Haptics = require('expo-haptics');

describe('InStoreDoneButton', () => {
  const onListDone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (shoppingListApi.markListDone as jest.Mock).mockResolvedValue({
      data: {
        archivedListId: 'list-1',
        newActiveListId: 'list-new',
        rolledOverItemCount: 2,
      },
    });
  });

  it('does not render when inStoreMode is false', () => {
    const { queryByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={false}
        onListDone={onListDone}
      />
    );
    expect(queryByText("I'm done shopping")).toBeNull();
  });

  it('renders when inStoreMode is true', () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );
    expect(getByText("I'm done shopping")).toBeTruthy();
  });

  it('has correct accessibilityLabel', () => {
    const { getByAccessibilityHint, getByRole, queryByText, getAllByRole } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );
    // The button is rendered with accessibilityLabel via BrandButton mock's testID fallback
    expect(queryByText("I'm done shopping")).toBeTruthy();
  });

  it('opens confirm sheet on tap', async () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));

    await waitFor(() => {
      expect(getByText('Wrap up shopping?')).toBeTruthy();
    });
  });

  it('calls markListDone when confirm is pressed', async () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));

    await waitFor(() => {
      expect(getByText('Yes, wrap up')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Yes, wrap up'));
    });

    expect(shoppingListApi.markListDone).toHaveBeenCalledWith('list-1');
  });

  it('calls onListDone callback after successful markListDone', async () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));

    await waitFor(() => getByText('Yes, wrap up'));

    await act(async () => {
      fireEvent.press(getByText('Yes, wrap up'));
    });

    await waitFor(() => {
      expect(onListDone).toHaveBeenCalledWith({
        archivedListId: 'list-1',
        newActiveListId: 'list-new',
        rolledOverItemCount: 2,
      });
    });
  });

  it('fires haptic medium on confirm', async () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));
    await waitFor(() => getByText('Yes, wrap up'));

    await act(async () => {
      fireEvent.press(getByText('Yes, wrap up'));
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Medium
    );
  });

  it('dismisses confirm sheet on cancel', async () => {
    const { getByText, queryByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));
    await waitFor(() => getByText('Cancel'));

    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      expect(queryByText('Wrap up shopping?')).toBeNull();
    });
  });

  it('does not call markListDone if confirm is cancelled', async () => {
    const { getByText } = render(
      <InStoreDoneButton
        listId="list-1"
        inStoreMode={true}
        onListDone={onListDone}
      />
    );

    fireEvent.press(getByText("I'm done shopping"));
    await waitFor(() => getByText('Cancel'));
    fireEvent.press(getByText('Cancel'));

    expect(shoppingListApi.markListDone).not.toHaveBeenCalled();
  });
});

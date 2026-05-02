// frontend/__tests__/components/shopping/StartFreshAction.test.tsx
// TDD: "Start fresh" action
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
    clearItems: jest.fn(),
    bulkAddItems: jest.fn(),
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
  return function MockHTO({ children, onPress, accessibilityLabel, testID, ...props }: any) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../components/ui/Icon', () => {
  const { View } = require('react-native');
  return function MockIcon({ accessibilityLabel, testID }: any) {
    return <View testID={testID || 'icon'} />;
  };
});

import { shoppingListApi } from '../../../lib/api';
import StartFreshAction from '../../../components/shopping/StartFreshAction';

const Haptics = require('expo-haptics');

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    quantity: '1',
    purchased: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

describe('StartFreshAction', () => {
  const onItemsCleared = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (shoppingListApi.clearItems as jest.Mock).mockResolvedValue({ success: true });
    (shoppingListApi.bulkAddItems as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a Start Fresh icon button', () => {
    const { getByLabelText } = render(
      <StartFreshAction
        listId="list-1"
        items={makeItems(5)}
        onItemsCleared={onItemsCleared}
      />
    );
    expect(getByLabelText('Start fresh')).toBeTruthy();
  });

  it('clears items directly when list has 10 or fewer items (no confirm sheet)', async () => {
    const items = makeItems(10);
    const { getByLabelText, queryByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    // No confirm sheet shown
    expect(queryByText('Clear all items?')).toBeNull();
    expect(shoppingListApi.clearItems).toHaveBeenCalledWith('list-1');
  });

  it('shows confirm sheet when list has more than 10 items', async () => {
    const items = makeItems(11);
    const { getByLabelText, getByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    fireEvent.press(getByLabelText('Start fresh'));

    await waitFor(() => {
      expect(getByText('Clear all items?')).toBeTruthy();
    });
  });

  it('clears items after confirming on large lists', async () => {
    const items = makeItems(15);
    const { getByLabelText, getByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    fireEvent.press(getByLabelText('Start fresh'));
    await waitFor(() => getByText('Yes, clear all'));

    await act(async () => {
      fireEvent.press(getByText('Yes, clear all'));
    });

    expect(shoppingListApi.clearItems).toHaveBeenCalledWith('list-1');
  });

  it('shows undo banner after clearing', async () => {
    const items = makeItems(5);
    const { getByLabelText, getByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    await waitFor(() => {
      expect(getByText('Undo')).toBeTruthy();
    });
  });

  it('restores items when undo is pressed within 5 seconds', async () => {
    const items = makeItems(5);
    const { getByLabelText, getByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    await waitFor(() => getByText('Undo'));

    await act(async () => {
      fireEvent.press(getByText('Undo'));
    });

    expect(shoppingListApi.bulkAddItems).toHaveBeenCalledWith(
      'list-1',
      expect.arrayContaining([expect.objectContaining({ name: 'Item 0' })])
    );
  });

  it('does not restore items after 5-second undo window expires', async () => {
    const items = makeItems(5);
    const { getByLabelText, queryByText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    // Advance past 5s window
    await act(async () => {
      jest.advanceTimersByTime(5100);
    });

    // Undo banner should be gone
    expect(queryByText('Undo')).toBeNull();

    // bulkAddItems was never called
    expect(shoppingListApi.bulkAddItems).not.toHaveBeenCalled();
  });

  it('fires haptic light on start fresh press', async () => {
    const items = makeItems(5);
    const { getByLabelText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('calls onItemsCleared after clearing', async () => {
    const items = makeItems(3);
    const { getByLabelText } = render(
      <StartFreshAction
        listId="list-1"
        items={items}
        onItemsCleared={onItemsCleared}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Start fresh'));
    });

    await waitFor(() => {
      expect(onItemsCleared).toHaveBeenCalledTimes(1);
    });
  });
});

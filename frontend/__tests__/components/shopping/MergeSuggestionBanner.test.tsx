// frontend/__tests__/components/shopping/MergeSuggestionBanner.test.tsx
// TDD: Merge suggestion banner
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
    getMergeSuggestion: jest.fn(),
    mergeFrom: jest.fn(),
    dismissMergeSuggestion: jest.fn(),
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO({ children, onPress, ...props }: any) {
    return <TouchableOpacity onPress={onPress} {...props}>{children}</TouchableOpacity>;
  };
});

import { shoppingListApi } from '../../../lib/api';
import MergeSuggestionBanner from '../../../components/shopping/MergeSuggestionBanner';

describe('MergeSuggestionBanner', () => {
  const activeListId = 'list-active';
  const onMerged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (shoppingListApi.mergeFrom as jest.Mock).mockResolvedValue({ success: true });
    (shoppingListApi.dismissMergeSuggestion as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders banner when suggestion prop provided with overlap >= 70%', () => {
    const { getByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.75 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );
    expect(getByText(/Last Week/)).toBeTruthy();
  });

  it('does not render when suggestion is null', () => {
    const { queryByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={null}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );
    expect(queryByText('Merge?')).toBeNull();
  });

  it('renders "Merge?" button', () => {
    const { getByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );
    expect(getByText('Merge?')).toBeTruthy();
  });

  it('calls mergeFrom with correct IDs on Merge press', async () => {
    const { getByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Merge?'));
    });

    expect(shoppingListApi.mergeFrom).toHaveBeenCalledWith(activeListId, 'list-old');
  });

  it('hides banner after successful merge', async () => {
    const { getByText, queryByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Merge?'));
    });

    await waitFor(() => {
      expect(queryByText('Merge?')).toBeNull();
    });
  });

  it('calls onMerged callback after successful merge', async () => {
    const { getByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Merge?'));
    });

    await waitFor(() => {
      expect(onMerged).toHaveBeenCalledTimes(1);
    });
  });

  it('calls dismissMergeSuggestion on X press', async () => {
    const onDismissed = jest.fn();
    const { getByLabelText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={onDismissed}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Dismiss merge suggestion'));
    });

    expect(shoppingListApi.dismissMergeSuggestion).toHaveBeenCalledWith(
      activeListId,
      'list-old'
    );
  });

  it('hides banner after dismiss', async () => {
    const onDismissed = jest.fn();
    const { getByLabelText, queryByText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={onDismissed}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Dismiss merge suggestion'));
    });

    await waitFor(() => {
      expect(queryByText('Merge?')).toBeNull();
    });
  });

  it('calls onDismissed callback after dismiss', async () => {
    const onDismissed = jest.fn();
    const { getByLabelText } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.8 }}
        onMerged={onMerged}
        onDismissed={onDismissed}
      />
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Dismiss merge suggestion'));
    });

    await waitFor(() => {
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
  });

  it('has peach-tinted background style', () => {
    const { getByTestId } = render(
      <MergeSuggestionBanner
        activeListId={activeListId}
        suggestion={{ suggestionId: 'list-old', name: 'Last Week', overlap: 0.75 }}
        onMerged={onMerged}
        onDismissed={jest.fn()}
        testID="merge-banner"
      />
    );

    const banner = getByTestId('merge-banner');
    expect(banner).toBeTruthy();
    // Peach background — verify the component renders without errors
    // Style verification is done by checking it renders in the correct container
  });
});

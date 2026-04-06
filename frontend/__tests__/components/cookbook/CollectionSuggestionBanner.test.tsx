// frontend/__tests__/components/cookbook/CollectionSuggestionBanner.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CollectionSuggestionBanner from '../../../components/cookbook/CollectionSuggestionBanner';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const baseProps = {
  savedCount: 12,
  customCollectionCount: 0,
  onDismiss: jest.fn(),
  onCreateSuggested: jest.fn(),
};

describe('CollectionSuggestionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders when savedCount >= 10 and customCollectionCount === 0', async () => {
    const { findByText } = render(<CollectionSuggestionBanner {...baseProps} />);
    expect(await findByText(/organize your cookbook/i)).toBeTruthy();
  });

  it('returns null when savedCount < 10', async () => {
    const { toJSON } = render(<CollectionSuggestionBanner {...baseProps} savedCount={5} />);
    // Synchronously no visible content
    await Promise.resolve();
    expect(toJSON()).toBeNull();
  });

  it('returns null when customCollectionCount > 0', async () => {
    const { toJSON } = render(
      <CollectionSuggestionBanner {...baseProps} customCollectionCount={1} />,
    );
    await Promise.resolve();
    expect(toJSON()).toBeNull();
  });

  it('returns null when already dismissed (AsyncStorage has flag)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByText, findByText } = render(<CollectionSuggestionBanner {...baseProps} />);
    // After the async check, banner should stay hidden
    await new Promise(r => setTimeout(r, 20));
    expect(queryByText(/organize your cookbook/i)).toBeNull();
  });

  it('calls onCreateSuggested when a suggestion chip is tapped', async () => {
    const onCreateSuggested = jest.fn();
    const { findAllByRole } = render(
      <CollectionSuggestionBanner {...baseProps} onCreateSuggested={onCreateSuggested} />,
    );
    const chips = await findAllByRole('button');
    // Tap the first suggestion chip (not the dismiss X)
    const suggestionChip = chips.find(c => c.props.accessibilityLabel?.includes('Create'));
    if (suggestionChip) fireEvent.press(suggestionChip);
    expect(onCreateSuggested).toHaveBeenCalledTimes(1);
    expect(typeof onCreateSuggested.mock.calls[0][0]).toBe('string');
  });

  it('calls onDismiss and persists flag when X is tapped', async () => {
    const onDismiss = jest.fn();
    const { findByTestId } = render(
      <CollectionSuggestionBanner {...baseProps} onDismiss={onDismiss} />,
    );
    const dismissBtn = await findByTestId('suggestion-banner-dismiss');
    fireEvent.press(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('collection_suggestion_dismissed'),
      'true',
    );
  });
});

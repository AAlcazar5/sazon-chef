// frontend/__tests__/components/shopping/CoPurchaseChips.test.tsx
// ROADMAP 4.0 IG5.2 — Co-purchase chip suggestions test.

const mockGetPairs = jest.fn();
jest.mock('../../../lib/api', () => ({
  ingredientPairsApi: {
    getPairs: (...args: unknown[]) => mockGetPairs(...args),
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import CoPurchaseChips from '../../../components/shopping/CoPurchaseChips';

beforeEach(() => {
  mockGetPairs.mockReset();
});

const pair = (ingredient: string, coCount = 1) => ({
  ingredient,
  coCount,
  lastSeenAt: '2026-05-07T00:00:00.000Z',
});

describe('IG5.2 — CoPurchaseChips', () => {
  it('renders top-5 chips when an anchor has co-occurrence data', async () => {
    mockGetPairs.mockResolvedValueOnce({
      data: {
        pairs: [
          pair('cilantro', 8),
          pair('lime', 6),
          pair('avocado', 4),
          pair('jalapeno', 3),
          pair('onion', 2),
          pair('garlic', 1), // 6th — must be dropped
        ],
      },
    });
    const { getByText, queryByText } = renderWithProviders(
      <CoPurchaseChips currentItems={['tortilla']} onAdd={jest.fn()} />,
    );
    await waitFor(() => {
      expect(getByText('cilantro')).toBeTruthy();
    });
    expect(getByText('lime')).toBeTruthy();
    expect(getByText('avocado')).toBeTruthy();
    expect(getByText('jalapeno')).toBeTruthy();
    expect(getByText('onion')).toBeTruthy();
    expect(queryByText('garlic')).toBeNull();
  });

  it('chip tap fires onAdd(name)', async () => {
    mockGetPairs.mockResolvedValueOnce({
      data: { pairs: [pair('cilantro', 5)] },
    });
    const onAdd = jest.fn();
    const { getByTestId } = renderWithProviders(
      <CoPurchaseChips currentItems={['tortilla']} onAdd={onAdd} />,
    );
    await waitFor(() => {
      expect(getByTestId('co-purchase-chip-cilantro')).toBeTruthy();
    });
    fireEvent.press(getByTestId('co-purchase-chip-cilantro'));
    expect(onAdd).toHaveBeenCalledWith('cilantro');
  });

  it('hides when no signals available', async () => {
    mockGetPairs.mockResolvedValue({ data: { pairs: [] } });
    const { queryByTestId } = renderWithProviders(
      <CoPurchaseChips currentItems={['tortilla']} onAdd={jest.fn()} />,
    );
    await waitFor(() => {
      expect(mockGetPairs).toHaveBeenCalled();
    });
    expect(queryByTestId('co-purchase-chips')).toBeNull();
  });

  it('hides when currentItems is empty (nothing to anchor on)', () => {
    const { queryByTestId } = renderWithProviders(
      <CoPurchaseChips currentItems={[]} onAdd={jest.fn()} />,
    );
    expect(queryByTestId('co-purchase-chips')).toBeNull();
    expect(mockGetPairs).not.toHaveBeenCalled();
  });

  it('hides on API error', async () => {
    mockGetPairs.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(
      <CoPurchaseChips currentItems={['tortilla']} onAdd={jest.fn()} />,
    );
    await waitFor(() => {
      expect(mockGetPairs).toHaveBeenCalled();
    });
    expect(queryByTestId('co-purchase-chips')).toBeNull();
  });

  it('dedupes pairs across multiple anchors and merges by coCount', async () => {
    mockGetPairs.mockImplementation((anchor: string) => {
      if (anchor === 'tortilla') {
        return Promise.resolve({
          data: { pairs: [pair('cilantro', 5), pair('lime', 3)] },
        });
      }
      return Promise.resolve({
        data: { pairs: [pair('cilantro', 4), pair('avocado', 2)] }, // cilantro again
      });
    });
    const { getAllByText, getByText } = renderWithProviders(
      <CoPurchaseChips
        currentItems={['tortilla', 'jalapeno']}
        onAdd={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(getByText('cilantro')).toBeTruthy();
    });
    // cilantro merged once (not twice)
    expect(getAllByText('cilantro')).toHaveLength(1);
    expect(getByText('lime')).toBeTruthy();
    expect(getByText('avocado')).toBeTruthy();
  });

  it('excludes pairs already in the current list', async () => {
    mockGetPairs.mockResolvedValue({
      data: { pairs: [pair('cilantro', 5), pair('lime', 3)] },
    });
    const { getByText, queryByText } = renderWithProviders(
      <CoPurchaseChips
        currentItems={['tortilla', 'cilantro']}
        onAdd={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(getByText('lime')).toBeTruthy();
    });
    expect(queryByText('cilantro')).toBeNull();
  });

  it('a11y: chip row has accessibilityRole="list"', async () => {
    mockGetPairs.mockResolvedValueOnce({
      data: { pairs: [pair('cilantro', 5)] },
    });
    const { getByTestId } = renderWithProviders(
      <CoPurchaseChips currentItems={['tortilla']} onAdd={jest.fn()} />,
    );
    await waitFor(() => {
      expect(getByTestId('co-purchase-chips')).toBeTruthy();
    });
    const root = getByTestId('co-purchase-chips');
    expect(root.props.accessibilityRole).toBe('list');
  });
});

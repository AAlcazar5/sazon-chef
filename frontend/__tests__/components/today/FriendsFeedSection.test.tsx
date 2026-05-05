// frontend/__tests__/components/today/FriendsFeedSection.test.tsx
// ROADMAP 4.0 F1 — friends feed Today section.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockFeed = jest.fn();
jest.mock('../../../lib/api', () => ({
  followsApi: {
    feed: (...a: unknown[]) => mockFeed(...a),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import FriendsFeedSection from '../../../components/today/FriendsFeedSection';

const ITEM = (overrides = {}) => ({
  plateId: 'p1',
  ownerId: 'friend1',
  ownerName: 'Maya',
  plateName: 'Charred broccoli farro bowl',
  shareSlug: 'cozy-farro-abcdef',
  score: {
    pantryCoverage: 0.83,
    dietaryCompatibility: 1,
    slotAffinityOverlap: 0.5,
    composite: 0.815,
  },
  createdAt: '2026-05-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FriendsFeedSection (F1)', () => {
  it('renders nothing while loading', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockFeed.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const { queryByTestId } = render(<FriendsFeedSection />);
    expect(queryByTestId('friends-feed-section')).toBeNull();
    resolve({ data: { items: [] } });
  });

  it('renders nothing when feed is empty', async () => {
    mockFeed.mockResolvedValueOnce({ data: { items: [] } });
    const { queryByTestId } = render(<FriendsFeedSection />);
    await waitFor(() => expect(mockFeed).toHaveBeenCalled());
    expect(queryByTestId('friends-feed-section')).toBeNull();
  });

  it('renders the section with up to 3 plates ranked by score', async () => {
    mockFeed.mockResolvedValueOnce({
      data: {
        items: [
          ITEM({ plateId: 'p1', plateName: 'Plate A' }),
          ITEM({ plateId: 'p2', plateName: 'Plate B' }),
          ITEM({ plateId: 'p3', plateName: 'Plate C' }),
          ITEM({ plateId: 'p4', plateName: 'Plate D' }),
        ],
      },
    });
    const { findByTestId, queryByTestId } = render(<FriendsFeedSection />);
    expect(await findByTestId('friends-feed-section')).toBeTruthy();
    expect(queryByTestId('friends-feed-card-p1')).toBeTruthy();
    expect(queryByTestId('friends-feed-card-p2')).toBeTruthy();
    expect(queryByTestId('friends-feed-card-p3')).toBeTruthy();
    expect(queryByTestId('friends-feed-card-p4')).toBeNull(); // capped at 3
  });

  it('shows the friend display name and pantry-match reason', async () => {
    mockFeed.mockResolvedValueOnce({
      data: { items: [ITEM({ ownerName: 'Maya', score: { ...ITEM().score, pantryCoverage: 0.85 } })] },
    });
    const { findByText } = render(<FriendsFeedSection />);
    expect(await findByText('Maya')).toBeTruthy();
    expect(await findByText(/85% from your pantry/)).toBeTruthy();
  });

  it('falls back to "A friend" when ownerName is null', async () => {
    mockFeed.mockResolvedValueOnce({
      data: { items: [ITEM({ ownerName: null })] },
    });
    const { findByText } = render(<FriendsFeedSection />);
    expect(await findByText('A friend')).toBeTruthy();
  });

  it('fires onSelect with the item on tap', async () => {
    const onSelect = jest.fn();
    mockFeed.mockResolvedValueOnce({ data: { items: [ITEM()] } });
    const { findByTestId } = render(<FriendsFeedSection onSelect={onSelect} />);
    const card = await findByTestId('friends-feed-card-p1');
    fireEvent.press(card);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ plateId: 'p1' }));
  });

  it('renders nothing when the feed call rejects', async () => {
    mockFeed.mockRejectedValueOnce(new Error('boom'));
    const { queryByTestId } = render(<FriendsFeedSection />);
    await waitFor(() => expect(mockFeed).toHaveBeenCalled());
    expect(queryByTestId('friends-feed-section')).toBeNull();
  });

  it('exposes accessibility label with friend name + pantry % + plate name', async () => {
    mockFeed.mockResolvedValueOnce({
      data: { items: [ITEM({ ownerName: 'Maya', plateName: 'Charred broccoli farro bowl' })] },
    });
    const { findByLabelText } = render(<FriendsFeedSection />);
    expect(
      await findByLabelText(/Maya's Charred broccoli farro bowl, 83% pantry match/i),
    ).toBeTruthy();
  });
});

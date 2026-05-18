// W-D P1/D-2 — KitchenCookLogView. The memory surface: renders the user's
// cooking over time, count-free (W-D1), with the "echo" of what Sazon
// learned. Empty/loading/error states are branded (no "Error:"). useCookLog
// is mocked so this is a pure view test.

jest.mock('../../../hooks/useCookLog', () => ({ useCookLog: jest.fn() }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KitchenCookLogView from '../../../components/kitchen/KitchenCookLogView';
import { useCookLog } from '../../../hooks/useCookLog';

const mockHook = useCookLog as jest.Mock;
const base = {
  entries: [],
  loading: false,
  error: null,
  hasMore: false,
  loadMore: jest.fn(),
  refresh: jest.fn(),
};
const entry = (id: string, type: string, payload: any = {}) => ({
  id,
  type,
  recipeId: null,
  payload,
  createdAt: new Date().toISOString(),
});

beforeEach(() => mockHook.mockReset());

describe('KitchenCookLogView', () => {
  it('renders cooks as human, count-free lines with the learned echo', () => {
    mockHook.mockReturnValue({
      ...base,
      entries: [
        entry('a', 'made_it'),
        entry('b', 'scale', { target: { amount: 2, unit: 'lb' } }),
      ],
    });
    const { getByText, queryByText } = render(<KitchenCookLogView isDark={false} />);
    expect(getByText('Made it')).toBeTruthy();
    expect(getByText('Scaled to 2 lb')).toBeTruthy();
    expect(getByText(/prep-friendly bias on/)).toBeTruthy();
    // W-D1: nowhere a recipe/catalog count.
    expect(queryByText(/\d+\s*recipes?/i)).toBeNull();
    expect(queryByText(/\bof\s+\d+\b/i)).toBeNull();
  });

  it('empty state is an invitation, not a "0"', () => {
    mockHook.mockReturnValue({ ...base, entries: [] });
    const { getByText, queryByText } = render(<KitchenCookLogView isDark={false} />);
    expect(getByText(/Your cooking story starts here/i)).toBeTruthy();
    expect(queryByText(/^0$|0 cooks|no recipes/i)).toBeNull();
  });

  it('loading (no entries) shows the Sazon loading state, not an error', () => {
    mockHook.mockReturnValue({ ...base, loading: true });
    const { getByText, queryByText } = render(<KitchenCookLogView isDark={false} />);
    expect(getByText(/Gathering your cooking story/i)).toBeTruthy();
    expect(queryByText(/Error:|Failed to/i)).toBeNull();
  });

  it('error (no entries) uses Sazon personality copy, never "Error:"', () => {
    mockHook.mockReturnValue({ ...base, error: 'HTTP_500' });
    const { getByText, queryByText } = render(<KitchenCookLogView isDark={false} />);
    expect(getByText(/Couldn’t reach your cook log/i)).toBeTruthy();
    expect(queryByText(/Error:|HTTP_500/)).toBeNull();
  });

  it('"Show earlier cooks" appears only when hasMore and calls loadMore', () => {
    const loadMore = jest.fn();
    mockHook.mockReturnValue({
      ...base,
      entries: [entry('a', 'made_it')],
      hasMore: true,
      loadMore,
    });
    const { getByText } = render(<KitchenCookLogView isDark={false} />);
    const btn = getByText('Show earlier cooks');
    fireEvent.press(btn);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('hides "Show earlier cooks" when exhausted', () => {
    mockHook.mockReturnValue({
      ...base,
      entries: [entry('a', 'made_it')],
      hasMore: false,
    });
    const { queryByText } = render(<KitchenCookLogView isDark={false} />);
    expect(queryByText('Show earlier cooks')).toBeNull();
  });
});

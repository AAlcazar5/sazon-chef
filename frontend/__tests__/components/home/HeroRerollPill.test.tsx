// ROADMAP 4.0 HX2.1 — HeroRerollPill tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import HeroRerollPill from '../../../components/home/HeroRerollPill';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../lib/homeSurfaceEvents', () => ({
  logHomeSurfaceEvent: jest.fn(),
}));

const mockReroll = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    heroReroll: (rank: number) => mockReroll(rank),
  },
}));

beforeEach(() => {
  mockReroll.mockReset();
});

const candidate = (id: string) => ({
  id, title: `Recipe ${id}`, imageUrl: null, cuisine: 'Italian', cookTime: 25,
});

describe('HeroRerollPill (HX2.1)', () => {
  it('renders the "Try another" CTA', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <HeroRerollPill onReroll={jest.fn()} />,
    );
    expect(getByTestId('hero-reroll-pill')).toBeTruthy();
    expect(getByText('Try another')).toBeTruthy();
  });

  it('first tap fetches rank=2 and calls onReroll with the next recipe', async () => {
    mockReroll.mockResolvedValue({ data: { rank: 2, recipe: candidate('r2'), exhausted: false } });
    const onReroll = jest.fn();
    const { getByTestId } = renderWithProviders(<HeroRerollPill onReroll={onReroll} />);

    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(onReroll).toHaveBeenCalled());
    expect(mockReroll).toHaveBeenCalledWith(2);
    expect(onReroll.mock.calls[0][0].id).toBe('r2');
  });

  it('three rerolls walk rank 2 → 3 → 4 then flips to "Surprise me"', async () => {
    mockReroll
      .mockResolvedValueOnce({ data: { rank: 2, recipe: candidate('r2'), exhausted: false } })
      .mockResolvedValueOnce({ data: { rank: 3, recipe: candidate('r3'), exhausted: false } })
      .mockResolvedValueOnce({ data: { rank: 4, recipe: candidate('r4'), exhausted: false } });

    const { getByTestId, findByText } = renderWithProviders(
      <HeroRerollPill onReroll={jest.fn()} onExhausted={jest.fn()} />,
    );

    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(mockReroll).toHaveBeenLastCalledWith(2));
    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(mockReroll).toHaveBeenLastCalledWith(3));
    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(mockReroll).toHaveBeenLastCalledWith(4));

    expect(await findByText('Surprise me')).toBeTruthy();
  });

  it('fires onExhausted when the user taps after burning all rerolls', async () => {
    mockReroll
      .mockResolvedValueOnce({ data: { rank: 2, recipe: candidate('r2'), exhausted: false } })
      .mockResolvedValueOnce({ data: { rank: 3, recipe: candidate('r3'), exhausted: false } })
      .mockResolvedValueOnce({ data: { rank: 4, recipe: candidate('r4'), exhausted: false } });
    const onExhausted = jest.fn();
    const { getByTestId, findByText } = renderWithProviders(
      <HeroRerollPill onReroll={jest.fn()} onExhausted={onExhausted} />,
    );

    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(mockReroll).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(mockReroll).toHaveBeenCalledTimes(2));
    fireEvent.press(getByTestId('hero-reroll-pill'));
    await findByText('Surprise me');

    fireEvent.press(getByTestId('hero-reroll-pill'));
    expect(onExhausted).toHaveBeenCalled();
  });

  it('honors backend exhausted=true even before MAX_REROLLS', async () => {
    mockReroll.mockResolvedValue({ data: { rank: 2, recipe: null, exhausted: true } });
    const onExhausted = jest.fn();
    const { getByTestId } = renderWithProviders(
      <HeroRerollPill onReroll={jest.fn()} onExhausted={onExhausted} />,
    );
    fireEvent.press(getByTestId('hero-reroll-pill'));
    await waitFor(() => expect(onExhausted).toHaveBeenCalled());
  });
});

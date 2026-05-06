// ROADMAP 4.0 HX5.1 — AlmostMadeItSheet tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import AlmostMadeItSheet from '../../../components/home/AlmostMadeItSheet';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../lib/homeSurfaceEvents', () => ({
  logHomeSurfaceEvent: jest.fn(),
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getAlmostMadeIt: (cutoff: number, tail?: number) => mockGet(cutoff, tail),
  },
}));

beforeEach(() => {
  mockGet.mockReset();
});

describe('AlmostMadeItSheet (HX5.1)', () => {
  it('renders nothing when cutCount is 0', () => {
    const { queryByTestId } = renderWithProviders(
      <AlmostMadeItSheet cutCount={0} cutoff={10} onSelect={jest.fn()} />,
    );
    expect(queryByTestId('almost-made-it-footer')).toBeNull();
  });

  it('renders the CTA line with the cut count', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <AlmostMadeItSheet cutCount={23} cutoff={10} onSelect={jest.fn()} />,
    );
    expect(getByTestId('almost-made-it-cta')).toBeTruthy();
    expect(getByText(/23 made the cut today/i)).toBeTruthy();
  });

  it('opens the sheet on tap and fetches near-misses', async () => {
    mockGet.mockResolvedValue({
      data: {
        rows: [
          { id: 'r1', title: 'Almost A', imageUrl: null, cuisine: 'Italian', cookTime: 25, marginVsCut: 1 },
          { id: 'r2', title: 'Almost B', imageUrl: null, cuisine: 'Thai', cookTime: 30, marginVsCut: 2 },
        ],
        cutCount: 23,
      },
    });

    const { getByTestId, queryByTestId } = renderWithProviders(
      <AlmostMadeItSheet cutCount={23} cutoff={10} onSelect={jest.fn()} />,
    );
    expect(queryByTestId('almost-made-it-sheet')).toBeNull();
    fireEvent.press(getByTestId('almost-made-it-cta'));
    await waitFor(() => {
      expect(getByTestId('almost-made-it-sheet')).toBeTruthy();
    });
    await waitFor(() => {
      expect(getByTestId('almost-made-it-row-r1')).toBeTruthy();
    });
    expect(getByTestId('almost-made-it-row-r2')).toBeTruthy();
  });

  it('routes to recipe modal on row tap', async () => {
    mockGet.mockResolvedValue({
      data: {
        rows: [{ id: 'r1', title: 'Almost A', imageUrl: null, cuisine: null, cookTime: null, marginVsCut: 1 }],
        cutCount: 23,
      },
    });
    const onSelect = jest.fn();
    const { getByTestId } = renderWithProviders(
      <AlmostMadeItSheet cutCount={23} cutoff={10} onSelect={onSelect} />,
    );
    fireEvent.press(getByTestId('almost-made-it-cta'));
    await waitFor(() => {
      expect(getByTestId('almost-made-it-row-r1')).toBeTruthy();
    });
    fireEvent.press(getByTestId('almost-made-it-row-r1'));
    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('uses lifestyle voice — no "score"/"rejected" jargon', async () => {
    mockGet.mockResolvedValue({
      data: {
        rows: [{ id: 'r1', title: 'Almost A', imageUrl: null, cuisine: null, cookTime: null, marginVsCut: 1 }],
        cutCount: 23,
      },
    });
    const { getByTestId, queryByText } = renderWithProviders(
      <AlmostMadeItSheet cutCount={23} cutoff={10} onSelect={jest.fn()} />,
    );
    fireEvent.press(getByTestId('almost-made-it-cta'));
    await waitFor(() => {
      expect(getByTestId('almost-made-it-sheet')).toBeTruthy();
    });
    expect(queryByText(/score/i)).toBeNull();
    expect(queryByText(/rejected/i)).toBeNull();
    expect(queryByText(/failed/i)).toBeNull();
  });
});

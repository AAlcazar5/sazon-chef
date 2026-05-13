// P1 retention — Sazon's Pick reveal smoke + once-per-day debounce.

const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGet(...args),
    setItem: (...args: unknown[]) => mockSet(...args),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return TouchableOpacity;
});

jest.mock('../../../constants/Haptics', () => ({
  HapticPatterns: { success: jest.fn() },
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SazonsPickCard from '../../../components/today/SazonsPickCard';

const recipe = {
  id: 'r1',
  title: 'Fesenjan',
  imageUrl: 'https://example.com/fesenjan.jpg',
  cuisine: 'Persian',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
});

describe('<SazonsPickCard />', () => {
  it('renders the sealed envelope on first open of the day', async () => {
    const { findByTestId, queryByTestId } = render(
      <SazonsPickCard recipe={recipe} reason="Persian streak — keep going." onOpen={jest.fn()} />,
    );
    await findByTestId('sazons-pick-card-sealed');
    expect(queryByTestId('sazons-pick-card-revealed')).toBeNull();
  });

  it('reveals the recipe when the sealed card is tapped + persists today\'s date', async () => {
    const { findByTestId, queryByTestId } = render(
      <SazonsPickCard recipe={recipe} reason="Persian streak." onOpen={jest.fn()} />,
    );
    const sealed = await findByTestId('sazons-pick-card-sealed');
    await act(async () => {
      fireEvent.press(sealed);
    });
    await waitFor(() => expect(queryByTestId('sazons-pick-card-revealed')).toBeTruthy());
    expect(mockSet).toHaveBeenCalledWith('@sazon/sazons_pick/last_revealed_date', expect.any(String));
  });

  it('skips the sealed state on subsequent opens the same day', async () => {
    const today = (() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();
    mockGet.mockResolvedValue(today);
    const { findByTestId, queryByTestId } = render(
      <SazonsPickCard recipe={recipe} reason="x" onOpen={jest.fn()} />,
    );
    await findByTestId('sazons-pick-card-revealed');
    expect(queryByTestId('sazons-pick-card-sealed')).toBeNull();
  });

  it('returns null when no recipe is provided', async () => {
    const { queryByTestId } = render(
      <SazonsPickCard recipe={null} reason="x" onOpen={jest.fn()} />,
    );
    // wait a tick to let the hydration effect run
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(queryByTestId('sazons-pick-card-sealed')).toBeNull();
    expect(queryByTestId('sazons-pick-card-revealed')).toBeNull();
  });

  it('fires onOpen with the recipe id after reveal', async () => {
    const onOpen = jest.fn();
    const today = (() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();
    mockGet.mockResolvedValue(today);
    const { findByTestId } = render(
      <SazonsPickCard recipe={recipe} reason="x" onOpen={onOpen} />,
    );
    const revealed = await findByTestId('sazons-pick-card-revealed');
    fireEvent.press(revealed.children[0] ?? revealed);
    expect(onOpen).toHaveBeenCalledWith('r1');
  });
});

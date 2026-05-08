// 10Y entry-points: Home screen Ask Sazon CTA card.
// Verifies signal-priority subtitle resolution + tap routing.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockUseCoachContext = jest.fn();
jest.mock('../../../hooks/useCoachContext', () => ({
  useCoachContext: () => mockUseCoachContext(),
}));

import AskSazonHomeCard, {
  resolveAskSazonSubtitle,
} from '../../../components/coach/AskSazonHomeCard';

const baseCtx = {
  pantryExpiringSoon: [] as string[],
  remainingMacros: null as { calories: number; protein: number; carbs: number; fat: number } | null,
  leftoverInventory: [] as Array<{ name?: string; componentId?: string }>,
  topAdjacentCuisine: null as string | null,
};

describe('resolveAskSazonSubtitle — pure resolver priority', () => {
  it('falls back to generic when no signals or loading', () => {
    expect(resolveAskSazonSubtitle({ ...baseCtx }, false)).toMatch(/hungry/i);
    expect(resolveAskSazonSubtitle(null, true)).toMatch(/hungry/i);
  });

  it('priority 1 — pantryExpiringSoon wins over everything', () => {
    const subtitle = resolveAskSazonSubtitle(
      {
        ...baseCtx,
        pantryExpiringSoon: ['salmon'],
        remainingMacros: { calories: 100, protein: 0, carbs: 0, fat: 0 },
        leftoverInventory: [{ name: 'chicken' }],
        topAdjacentCuisine: 'Burmese',
      },
      false,
    );
    expect(subtitle).toMatch(/salmon/);
    expect(subtitle).toMatch(/expiring/i);
  });

  it('priority 2 — low remaining calories triggers dessert prompt', () => {
    const subtitle = resolveAskSazonSubtitle(
      { ...baseCtx, remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 } },
      false,
    );
    expect(subtitle).toMatch(/320 cal left for dessert/i);
  });

  it('priority 3 — leftoverInventory bridge prompt', () => {
    const subtitle = resolveAskSazonSubtitle(
      { ...baseCtx, leftoverInventory: [{ name: 'chicken' }] },
      false,
    );
    expect(subtitle).toMatch(/Bridge yesterday's chicken/i);
  });

  it('priority 4 — top adjacent cuisine prompt', () => {
    const subtitle = resolveAskSazonSubtitle(
      { ...baseCtx, topAdjacentCuisine: 'Burmese' },
      false,
    );
    expect(subtitle).toMatch(/Burmese plate/i);
  });

  it('does not trigger dessert prompt when calories above threshold', () => {
    const subtitle = resolveAskSazonSubtitle(
      { ...baseCtx, remainingMacros: { calories: 900, protein: 0, carbs: 0, fat: 0 } },
      false,
    );
    expect(subtitle).toMatch(/hungry/i);
  });
});

describe('AskSazonHomeCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders generic fallback while context is loading', () => {
    mockUseCoachContext.mockReturnValue({ context: null, isLoading: true, error: null });
    const { getByText } = render(<AskSazonHomeCard />);
    expect(getByText(/Ask Sazon/i)).toBeTruthy();
    expect(getByText(/hungry/i)).toBeTruthy();
  });

  it('shows pantry-expiring subtitle when item present', () => {
    mockUseCoachContext.mockReturnValue({
      context: { ...baseCtx, pantryExpiringSoon: ['salmon'] },
      isLoading: false,
      error: null,
    });
    const { getByText } = render(<AskSazonHomeCard />);
    expect(getByText(/salmon expiring/i)).toBeTruthy();
  });

  it('shows remaining-calories dessert subtitle', () => {
    mockUseCoachContext.mockReturnValue({
      context: { ...baseCtx, remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 } },
      isLoading: false,
      error: null,
    });
    const { getByText } = render(<AskSazonHomeCard />);
    expect(getByText(/320 cal left for dessert/i)).toBeTruthy();
  });

  it('shows leftover bridge subtitle', () => {
    mockUseCoachContext.mockReturnValue({
      context: { ...baseCtx, leftoverInventory: [{ name: 'chicken' }] },
      isLoading: false,
      error: null,
    });
    const { getByText } = render(<AskSazonHomeCard />);
    expect(getByText(/Bridge yesterday's chicken/i)).toBeTruthy();
  });

  it('shows adjacent-cuisine subtitle', () => {
    mockUseCoachContext.mockReturnValue({
      context: { ...baseCtx, topAdjacentCuisine: 'Burmese' },
      isLoading: false,
      error: null,
    });
    const { getByText } = render(<AskSazonHomeCard />);
    expect(getByText(/Burmese plate/i)).toBeTruthy();
  });

  it('routes to coach tab on press', () => {
    mockUseCoachContext.mockReturnValue({
      context: { ...baseCtx, topAdjacentCuisine: 'Burmese' },
      isLoading: false,
      error: null,
    });
    const { getByLabelText } = render(<AskSazonHomeCard />);
    fireEvent.press(getByLabelText(/Burmese plate/i));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/coach');
  });
});

// frontend/__tests__/components/home/DidYouKnowCard.test.tsx
// Group 10R Surface 3 — "Did You Know?" rotating tip card on home feed.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={testID}>
        {children}
      </TouchableOpacity>
    ),
  };
});

const mockMatchFoodIntelTips = jest.fn();
const mockRecordTipEngagement = jest.fn();
jest.mock('../../../lib/foodIntelMatcher', () => ({
  matchFoodIntelTips: (...args: unknown[]) => mockMatchFoodIntelTips(...args),
  recordTipEngagement: (...args: unknown[]) => mockRecordTipEngagement(...args),
}));

const mockUseFoodIntelUserState = jest.fn();
jest.mock(
  '../../../hooks/useFoodIntelUserState',
  () => ({
    useFoodIntelUserState: () => mockUseFoodIntelUserState(),
  }),
  { virtual: true }
);

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DidYouKnowCard from '../../../components/home/DidYouKnowCard';

const TIP_A = {
  id: 'sf-turmeric-pepper',
  category: 'superfood' as const,
  trigger: 'turmeric',
  title: 'Pair turmeric with black pepper',
  body: 'Black pepper boosts curcumin absorption from turmeric by up to 2,000%.',
  tags: ['turmeric', 'black pepper'],
  personalizationKeys: {
    cuisine: ['indian'],
    nutrient: ['anti-inflammatory'],
    skillTier: ['beginner', 'cook', 'chef'] as const,
    goalPhase: ['any'] as const,
  },
};

const TIP_B = {
  id: 'sf-ginger-anti-inflam',
  category: 'superfood' as const,
  trigger: 'ginger',
  title: 'Ginger calms inflammation',
  body: 'Fresh ginger contains gingerol — clinically shown to reduce muscle soreness.',
  tags: ['ginger'],
  personalizationKeys: {
    cuisine: ['asian'],
    nutrient: ['anti-inflammatory'],
    skillTier: ['beginner', 'cook', 'chef'] as const,
    goalPhase: ['any'] as const,
  },
};

const USER_STATE = {
  userId: 'user-1',
  cookHistory: { cuisines: ['indian'] },
  topAffinityIngredients: [],
  rolling7dNutrientGaps: [],
  skillTier: 'cook' as const,
  goalPhase: 'any' as const,
  last7DaysIngredients: ['turmeric', 'lentils'],
};

describe('DidYouKnowCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFoodIntelUserState.mockReturnValue(USER_STATE);
    mockMatchFoodIntelTips.mockResolvedValue([TIP_A]);
    mockRecordTipEngagement.mockResolvedValue(undefined);
  });

  it('renders a tip when matcher returns one', async () => {
    const { findByText } = render(<DidYouKnowCard />);
    expect(await findByText(TIP_A.title)).toBeTruthy();
  });

  it('renders the "Did You Know?" eyebrow', async () => {
    const { findByText } = render(<DidYouKnowCard />);
    expect(await findByText(/did you know/i)).toBeTruthy();
  });

  it('renders nothing when matcher returns no tips', async () => {
    mockMatchFoodIntelTips.mockResolvedValue([]);
    const { queryByTestId } = render(<DidYouKnowCard testID="dyk-card" />);
    await waitFor(() => {
      expect(mockMatchFoodIntelTips).toHaveBeenCalled();
    });
    expect(queryByTestId('dyk-card')).toBeNull();
  });

  it('has accessibilityLabel on the card', async () => {
    const { findByLabelText } = render(<DidYouKnowCard />);
    expect(await findByLabelText(/did you know/i)).toBeTruthy();
  });

  it('dismiss removes the card from the tree and records dismissal', async () => {
    const onDismiss = jest.fn();
    const { findByTestId, queryByText } = render(
      <DidYouKnowCard testID="dyk-card" onDismiss={onDismiss} />
    );
    const dismissBtn = await findByTestId('dyk-card-dismiss');
    await act(async () => {
      fireEvent.press(dismissBtn);
    });
    await waitFor(() => {
      expect(queryByText(TIP_A.title)).toBeNull();
    });
    expect(mockRecordTipEngagement).toHaveBeenCalledWith(
      USER_STATE.userId,
      TIP_A.id,
      'dismissed'
    );
    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismissed tip does not reappear within session on re-render', async () => {
    const { findByTestId, queryByText, rerender } = render(<DidYouKnowCard testID="dyk-card" />);
    const dismissBtn = await findByTestId('dyk-card-dismiss');
    await act(async () => {
      fireEvent.press(dismissBtn);
    });
    await waitFor(() => {
      expect(queryByText(TIP_A.title)).toBeNull();
    });
    // Even if matcher would return the same tip again, dismissal is sticky for the session.
    rerender(<DidYouKnowCard testID="dyk-card" />);
    expect(queryByText(TIP_A.title)).toBeNull();
  });

  it('shows whatever tip matcher returns on a fresh mount', async () => {
    mockMatchFoodIntelTips.mockResolvedValue([TIP_B]);
    const { findByText } = render(<DidYouKnowCard />);
    expect(await findByText(TIP_B.title)).toBeTruthy();
  });

  it('tapping the card body records an "expanded" engagement', async () => {
    const { findByTestId } = render(<DidYouKnowCard testID="dyk-card" />);
    const body = await findByTestId('dyk-card-body');
    await act(async () => {
      fireEvent.press(body);
    });
    await waitFor(() => {
      expect(mockRecordTipEngagement).toHaveBeenCalledWith(
        USER_STATE.userId,
        TIP_A.id,
        'expanded'
      );
    });
  });

  it('tapping a searchable tip routes to home search with the trigger as query', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    router.push.mockClear();
    // TIP_A.trigger = 'turmeric' — superfood category is searchable.
    const { findByTestId } = render(<DidYouKnowCard testID="dyk-card" />);
    const body = await findByTestId('dyk-card-body');
    await act(async () => {
      fireEvent.press(body);
    });
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/?search=turmeric');
    });
  });

  it('tapping a non-searchable tip does not navigate', async () => {
    const TIP_TECH = { ...TIP_A, id: 'tech-1', category: 'technique' as const, trigger: 'searing' };
    mockMatchFoodIntelTips.mockResolvedValue([TIP_TECH]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    router.push.mockClear();
    const { findByTestId } = render(<DidYouKnowCard testID="dyk-card" />);
    const body = await findByTestId('dyk-card-body');
    await act(async () => {
      fireEvent.press(body);
    });
    // Engagement still records but no navigation fires.
    await waitFor(() => {
      expect(mockRecordTipEngagement).toHaveBeenCalled();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('mounts and renders without crashing under the animation system (fade-in smoke)', async () => {
    const { findByTestId } = render(<DidYouKnowCard testID="dyk-card" />);
    expect(await findByTestId('dyk-card')).toBeTruthy();
  });

  it('calls matcher with last 7 days ingredients + home screenType + user state', async () => {
    render(<DidYouKnowCard />);
    await waitFor(() => {
      expect(mockMatchFoodIntelTips).toHaveBeenCalledWith(
        expect.objectContaining({
          ingredients: ['turmeric', 'lentils'],
          screenType: 'home',
        }),
        USER_STATE
      );
    });
  });

  it('falls back to empty ingredients when user state has no last7DaysIngredients', async () => {
    mockUseFoodIntelUserState.mockReturnValue({ ...USER_STATE, last7DaysIngredients: undefined });
    render(<DidYouKnowCard />);
    await waitFor(() => {
      expect(mockMatchFoodIntelTips).toHaveBeenCalledWith(
        expect.objectContaining({ ingredients: [], screenType: 'home' }),
        expect.any(Object)
      );
    });
  });
});

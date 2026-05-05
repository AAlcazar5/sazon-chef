// frontend/__tests__/components/cooking/CookCompleteCelebration.tier.test.tsx
// ROADMAP 4.0 Tier J14 — Variable-reward cook-complete tiers (TDD frontend).
// Sourced from .context/decisions/accepted/P-002-variable-reward-cook-complete.md.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockHaptic(...args),
  notificationAsync: (...args: unknown[]) => mockHaptic(...args),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import CookCompleteCelebration from '../../../components/cooking/CookCompleteCelebration';

beforeEach(() => {
  jest.clearAllMocks();
  mockHaptic.mockReset();
});

describe('<CookCompleteCelebration />', () => {
  describe('big tier', () => {
    it('renders the big-tier hero (Lottie placeholder + share prompt)', () => {
      const { getByTestId } = render(
        <CookCompleteCelebration tier="big" recipeTitle="Khoresh Fesenjan" />,
      );
      expect(getByTestId('cook-complete-celebration')).toBeTruthy();
      expect(getByTestId('cook-complete-celebration-big')).toBeTruthy();
      expect(getByTestId('cook-complete-celebration-share-prompt')).toBeTruthy();
    });

    it('exposes a big-tier accessibility label that announces the celebration kind', () => {
      const { getByTestId } = render(
        <CookCompleteCelebration tier="big" recipeTitle="Khoresh Fesenjan" />,
      );
      const root = getByTestId('cook-complete-celebration');
      expect(root.props.accessibilityLabel).toMatch(/big/i);
      expect(root.props.accessibilityLabel).toMatch(/khoresh fesenjan/i);
    });
  });

  describe('medium tier', () => {
    it('renders the medium-tier sparkle + wink, no share prompt', () => {
      const { getByTestId, queryByTestId } = render(
        <CookCompleteCelebration tier="medium" recipeTitle="Shirazi Salad" />,
      );
      expect(getByTestId('cook-complete-celebration-medium')).toBeTruthy();
      expect(getByTestId('cook-complete-celebration-sparkle')).toBeTruthy();
      expect(queryByTestId('cook-complete-celebration-share-prompt')).toBeNull();
      expect(queryByTestId('cook-complete-celebration-big')).toBeNull();
    });

    it('exposes a medium-tier accessibility label that announces the celebration kind', () => {
      const { getByTestId } = render(
        <CookCompleteCelebration tier="medium" recipeTitle="Shirazi Salad" />,
      );
      const root = getByTestId('cook-complete-celebration');
      expect(root.props.accessibilityLabel).toMatch(/medium/i);
    });
  });

  describe('quiet tier', () => {
    it('renders the quiet-tier checkmark only — no sparkle, no share prompt', () => {
      const { getByTestId, queryByTestId } = render(
        <CookCompleteCelebration tier="quiet" recipeTitle="Lentil Stew" />,
      );
      expect(getByTestId('cook-complete-celebration-quiet')).toBeTruthy();
      expect(getByTestId('cook-complete-celebration-checkmark')).toBeTruthy();
      expect(queryByTestId('cook-complete-celebration-sparkle')).toBeNull();
      expect(queryByTestId('cook-complete-celebration-share-prompt')).toBeNull();
    });

    it('fires a single light haptic on mount, not the heavier success haptic', () => {
      render(<CookCompleteCelebration tier="quiet" recipeTitle="Lentil Stew" />);
      expect(mockHaptic).toHaveBeenCalledTimes(1);
      expect(mockHaptic).toHaveBeenCalledWith('Light');
    });

    it('exposes a quiet-tier accessibility label that announces the celebration kind', () => {
      const { getByTestId } = render(
        <CookCompleteCelebration tier="quiet" recipeTitle="Lentil Stew" />,
      );
      const root = getByTestId('cook-complete-celebration');
      expect(root.props.accessibilityLabel).toMatch(/quiet/i);
    });
  });

  it('regression — copy contains no banned vocabulary', () => {
    const { toJSON } = render(
      <CookCompleteCelebration tier="big" recipeTitle="Khoresh Fesenjan" />,
    );
    const banned = ['track', 'goal', 'macro', 'crush', 'optimize', 'cut/bulk'];

    const collectText = (node: unknown): string => {
      if (node == null) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(collectText).join(' ');
      if (typeof node === 'object') {
        const obj = node as { children?: unknown; props?: { children?: unknown } };
        if (obj.children !== undefined) return collectText(obj.children);
        if (obj.props?.children !== undefined) return collectText(obj.props.children);
      }
      return '';
    };

    const allText = collectText(toJSON()).toLowerCase();
    for (const phrase of banned) {
      expect(allText).not.toContain(phrase);
    }
  });
});

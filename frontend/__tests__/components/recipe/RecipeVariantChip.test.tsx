// frontend/__tests__/components/recipe/RecipeVariantChip.test.tsx
// ROADMAP 4.0 Tier J18.1 — Recipe variant chip (TDD).

const mockHaptic = jest.fn();

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockHaptic(...args),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecipeVariantChip from '../../../components/recipe/RecipeVariantChip';

function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (typeof node === 'object') {
    const obj = node as { children?: unknown };
    return collectText(obj.children ?? '');
  }
  return '';
}

beforeEach(() => mockHaptic.mockReset());

describe('<RecipeVariantChip />', () => {
  it('renders the variant tag label', () => {
    const { getByText } = render(
      <RecipeVariantChip
        tag="lighter"
        siblingRecipeId="sib-1"
        onPress={jest.fn()}
      />,
    );
    expect(getByText(/lighter/i)).toBeTruthy();
  });

  it('renders nothing when no sibling id is provided', () => {
    const { queryByTestId } = render(
      <RecipeVariantChip
        tag="lighter"
        siblingRecipeId=""
        onPress={jest.fn()}
      />,
    );
    expect(queryByTestId('recipe-variant-chip')).toBeNull();
  });

  it('fires onPress with the sibling id and triggers haptic', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <RecipeVariantChip
        tag="lighter"
        siblingRecipeId="sib-1"
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('recipe-variant-chip'));
    expect(onPress).toHaveBeenCalledWith('sib-1');
    expect(mockHaptic).toHaveBeenCalled();
  });

  describe('banned-vocab regression', () => {
    const BANNED = [
      'healthy alternative',
      'guilt-free',
      'skinny',
      'macro-friendly',
      'instead of',
      'low-fat',
      'diet',
      'lose',
      'weight',
      'less than',
      'optimize',
    ];

    it('contains no banned chip text for any of the four tags', () => {
      const tags: ('weeknight' | 'sunday' | 'campfire' | 'lighter')[] = [
        'weeknight', 'sunday', 'campfire', 'lighter',
      ];
      for (const tag of tags) {
        const { toJSON } = render(
          <RecipeVariantChip tag={tag} siblingRecipeId="x" onPress={jest.fn()} />,
        );
        const text = collectText(toJSON()).toLowerCase();
        for (const term of BANNED) {
          expect(text).not.toContain(term.toLowerCase());
        }
      }
    });
  });
});

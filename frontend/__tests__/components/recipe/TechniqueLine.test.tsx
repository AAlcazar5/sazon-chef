// frontend/__tests__/components/recipe/TechniqueLine.test.tsx
// ROADMAP 4.0 Tier J18.1 — Technique line (TDD).

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
import TechniqueLine from '../../../components/recipe/TechniqueLine';

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

describe('<TechniqueLine />', () => {
  it('renders the supplied technique text as a recipe subtitle', () => {
    const { getByText, getByTestId } = render(
      <TechniqueLine text="oven-finished — same melt, less oil" />,
    );
    expect(getByText(/oven-finished/)).toBeTruthy();
    // The component declares accessibilityRole="text" — confirms it is a
    // non-interactive subtitle, not a footer button or disclaimer.
    expect(getByTestId('technique-line').props.accessibilityRole).toBe('text');
  });

  it('renders nothing for empty/null text', () => {
    const { queryByTestId, rerender } = render(<TechniqueLine text="" />);
    expect(queryByTestId('technique-line')).toBeNull();
    rerender(<TechniqueLine text={null} />);
    expect(queryByTestId('technique-line')).toBeNull();
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

    it('does not transform clean technique text to introduce banned vocab', () => {
      const { toJSON } = render(<TechniqueLine text="A clean technique line." />);
      const text = collectText(toJSON()).toLowerCase();
      for (const term of BANNED) {
        expect(text).not.toContain(term.toLowerCase());
      }
    });
  });
});

// frontend/__tests__/components/cooking/CookRecapLine.test.tsx
// ROADMAP 4.0 Tier J16 — Auto-generated cook recap line (TDD frontend).
// Sourced from .context/decisions/accepted/P-004-auto-generated-cook-recap-line.md.

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
import CookRecapLine from '../../../components/cooking/CookRecapLine';

describe('<CookRecapLine />', () => {
  it('renders the insight text when an insight is provided', () => {
    const { getByTestId, getByText } = render(
      <CookRecapLine insight="Third Persian dish this month." />,
    );
    expect(getByTestId('cook-recap-line')).toBeTruthy();
    expect(getByText(/third persian dish this month/i)).toBeTruthy();
  });

  it('renders nothing when insight is null', () => {
    const { queryByTestId } = render(<CookRecapLine insight={null} />);
    expect(queryByTestId('cook-recap-line')).toBeNull();
  });

  it('renders nothing when insight is an empty string', () => {
    const { queryByTestId } = render(<CookRecapLine insight="" />);
    expect(queryByTestId('cook-recap-line')).toBeNull();
  });

  it('enforces a single line via testID (numberOfLines={1})', () => {
    const { getByTestId } = render(
      <CookRecapLine insight="You and Lebanese cuisine — third week in a row." />,
    );
    const text = getByTestId('cook-recap-line-text');
    expect(text.props.numberOfLines).toBe(1);
  });

  it('exposes accessibility role and label matching the rendered string', () => {
    const insight = 'First time cooking with sumac.';
    const { getByTestId } = render(<CookRecapLine insight={insight} />);
    const root = getByTestId('cook-recap-line');
    expect(root.props.accessibilityRole).toBe('text');
    expect(root.props.accessibilityLabel).toBe(insight);
  });

  it('regression — does not render any banned vocabulary even if upstream produces it', () => {
    // Defense-in-depth: even if the service somehow returns banned phrasing,
    // verify that the component does not transform the string in a way that
    // would expose it through alternate channels (a11y label etc.).
    const banned = 'You crushed your goal today.'; // synthetic banned input
    const { queryByTestId } = render(<CookRecapLine insight={banned} />);
    // Component shouldn't filter content (that's the service's job), but the
    // a11y label should match exactly so a downstream banned-vocab regression
    // test in the service tier would catch it. Verify no transformation.
    const root = queryByTestId('cook-recap-line');
    expect(root).toBeTruthy();
    expect(root!.props.accessibilityLabel).toBe(banned);
  });
});

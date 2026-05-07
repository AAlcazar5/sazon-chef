// frontend/__tests__/components/ui/StatusBadge.test.tsx
// ROADMAP 4.0 DS1.6 — color-blind pattern overlay on status badges.

import React from 'react';
import { render } from '@testing-library/react-native';
import StatusBadge, { Pattern } from '../../../components/ui/StatusBadge';
import { Semantic } from '../../../constants/tokens';

describe('DS1.6 — StatusBadge with patternMode', () => {
  it('renders the variant label', () => {
    const { getByText } = render(<StatusBadge variant="success" label="Saved" />);
    expect(getByText('Saved')).toBeTruthy();
  });

  it('uses the semantic light color for the variant background', () => {
    const { getByTestId } = render(<StatusBadge variant="error" label="Down" testID="badge" />);
    const badge = getByTestId('badge');
    const bg = (badge.props.style as Array<{ backgroundColor?: string }>)
      .map((s) => s.backgroundColor)
      .find(Boolean);
    expect(bg).toBe(Semantic.light.error);
  });

  it('uses the semantic dark color when isDark is true', () => {
    const { getByTestId } = render(<StatusBadge variant="warning" label="Heads up" isDark testID="badge" />);
    const badge = getByTestId('badge');
    const bg = (badge.props.style as Array<{ backgroundColor?: string }>)
      .map((s) => s.backgroundColor)
      .find(Boolean);
    expect(bg).toBe(Semantic.dark.warning);
  });

  it('does NOT render the pattern overlay by default (hue-only)', () => {
    const { queryByTestId } = render(<StatusBadge variant="info" label="Note" testID="badge" />);
    expect(queryByTestId('badge-pattern')).toBeNull();
  });

  it('renders the pattern overlay when patternMode is true', () => {
    const { getByTestId } = render(
      <StatusBadge variant="success" label="Saved" patternMode testID="badge" />,
    );
    expect(getByTestId('badge-pattern', { includeHiddenElements: true })).toBeTruthy();
  });

  it('pattern overlay is hidden from screen readers (a11y duplication guard)', () => {
    const { getByTestId } = render(
      <StatusBadge variant="success" label="Saved" patternMode testID="badge" />,
    );
    const overlay = getByTestId('badge-pattern', { includeHiddenElements: true });
    expect(overlay.props.accessibilityElementsHidden).toBe(true);
    expect(overlay.props.importantForAccessibility).toBe('no');
  });

  it('exposes Pattern.diagonal token for shared reuse', () => {
    expect(Pattern.diagonal.stripeWidth).toBe(4);
    expect(Pattern.diagonal.opacity).toBeGreaterThan(0);
    expect(Pattern.diagonal.opacity).toBeLessThan(1);
  });

  it('falls back to a "<variant>: <label>" accessibility label when none is given', () => {
    const { getByLabelText } = render(<StatusBadge variant="error" label="Network down" />);
    expect(getByLabelText('error: Network down')).toBeTruthy();
  });

  it('respects an explicit accessibilityLabel override', () => {
    const { getByLabelText } = render(
      <StatusBadge variant="success" label="OK" accessibilityLabel="Saved successfully" />,
    );
    expect(getByLabelText('Saved successfully')).toBeTruthy();
  });
});

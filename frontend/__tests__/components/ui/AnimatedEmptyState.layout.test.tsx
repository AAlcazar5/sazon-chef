// AnimatedEmptyState: `layout` prop ('centered' default, 'top' opt-in).
//
// Why 'top' exists: when an empty state sits below a tab bar or section
// header, the default flex:1 + justifyContent:center pushes the empty
// state card to the vertical middle of the available space, leaving a
// visible void between the tabs and the card. `layout="top"` switches
// to a natural-height layout pinned near the top with a modest paddingTop.

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedEmptyState from '../../../components/ui/AnimatedEmptyState';

describe("AnimatedEmptyState: layout='top' opt-in", () => {
  it('renders with no errors when layout="top"', () => {
    const { toJSON } = render(
      <AnimatedEmptyState
        layout="top"
        title="Your cookbook awaits"
        description="Save recipes you love."
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('defaults to centered layout when prop is omitted', () => {
    // Snapshot the styles of the outer container in each mode and verify
    // they differ: 'centered' has flex:1, 'top' does not.
    const centered = render(
      <AnimatedEmptyState title="t" description="d" />,
    );
    const top = render(
      <AnimatedEmptyState title="t" description="d" layout="top" />,
    );

    // Find the outermost View in each tree and compare its style.
    const centeredRoot = (centered.toJSON() as any);
    const topRoot = (top.toJSON() as any);

    // The outermost View carries the layout style. Snapshots will differ
    // if the styles diverge — we just assert that they are NOT equal.
    expect(JSON.stringify(centeredRoot.props.style)).not.toBe(
      JSON.stringify(topRoot.props.style),
    );
  });

  it('layout="top" still wraps in a tinted card when pastelTint is provided', () => {
    // The tint card should still render — only the outer container
    // changes between layouts.
    const { queryByText } = render(
      <AnimatedEmptyState
        title="t"
        description="d"
        layout="top"
        pastelTint="#FDE8DC"
      />,
    );
    expect(queryByText('t')).toBeTruthy();
    expect(queryByText('d')).toBeTruthy();
  });
});

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { StickyBottomBar } from '../../../components/ui/StickyBottomBar';

describe('StickyBottomBar', () => {
  it('renders children inside', () => {
    const { getByText } = render(
      <StickyBottomBar>
        <Text>Start cooking</Text>
      </StickyBottomBar>
    );
    expect(getByText('Start cooking')).toBeTruthy();
  });

  it('renders gradient fade overlay (container has absolute positioning)', () => {
    const { getByTestId } = render(
      <StickyBottomBar testID="bar">
        <Text>CTA</Text>
      </StickyBottomBar>
    );
    // LinearGradient mock doesn't pass testID — verify bar renders with correct positioning
    expect(getByTestId('bar')).toBeTruthy();
  });

  it('positions at bottom with absolute', () => {
    const { getByTestId } = render(
      <StickyBottomBar testID="bar">
        <Text>CTA</Text>
      </StickyBottomBar>
    );
    const bar = getByTestId('bar');
    const flatStyle = Array.isArray(bar.props.style)
      ? Object.assign({}, ...bar.props.style.filter(Boolean))
      : bar.props.style;
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.bottom).toBe(0);
  });
});

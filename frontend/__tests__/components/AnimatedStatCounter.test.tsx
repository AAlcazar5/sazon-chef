// frontend/__tests__/components/AnimatedStatCounter.test.tsx
// Phase 4 Profile: AnimatedStatCounter — counts up from 0 to value on mount

import React from 'react';
import { render, act } from '@testing-library/react-native';
import AnimatedStatCounter from '../../components/ui/AnimatedStatCounter';

describe('AnimatedStatCounter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders without crashing', () => {
    const { toJSON } = render(<AnimatedStatCounter value={42} />);
    expect(toJSON()).toBeTruthy();
  });

  // React Native renders <Text>{n}</Text> as children=['', String(n), ''] when
  // value is wrapped — extract the numeric segment.
  const readDisplayedNumber = (el: any): number => {
    const c = el.props.children;
    if (typeof c === 'number') return c;
    if (Array.isArray(c)) {
      const num = c.find((s: unknown) => typeof s === 'string' && s.trim() !== '');
      return Number(num);
    }
    return Number(c);
  };

  it('starts at 0 before any ticks', () => {
    const { getByTestId } = render(<AnimatedStatCounter value={100} testID="counter" />);
    expect(readDisplayedNumber(getByTestId('counter'))).toBe(0);
  });

  it('reaches the target value after duration elapses', async () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={50} duration={800} testID="counter" />
    );
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(readDisplayedNumber(getByTestId('counter'))).toBe(50);
  });

  it('renders 0 immediately when value is 0', () => {
    const { getByTestId } = render(<AnimatedStatCounter value={0} testID="counter" />);
    expect(readDisplayedNumber(getByTestId('counter'))).toBe(0);
  });

  it('accepts a custom duration prop without crashing', () => {
    const { toJSON } = render(<AnimatedStatCounter value={10} duration={400} />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const { getByTestId } = render(
      <AnimatedStatCounter value={5} style={{ color: 'red' }} testID="counter" />
    );
    expect(getByTestId('counter').props.style).toMatchObject({ color: 'red' });
  });
});

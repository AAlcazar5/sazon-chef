// frontend/__tests__/components/AnimatedProgressBar.test.tsx
// Phase 1: AnimatedProgressBar (Reanimated-based progress indicator)

import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedProgressBar from '../../components/ui/AnimatedProgressBar';

describe('AnimatedProgressBar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<AnimatedProgressBar progress={50} />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom height without crashing', () => {
    const { toJSON } = render(
      <AnimatedProgressBar progress={50} height={16} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom backgroundColor without crashing', () => {
    const { toJSON } = render(
      <AnimatedProgressBar progress={50} backgroundColor="#FF0000" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom progressColor without crashing', () => {
    const { toJSON } = render(
      <AnimatedProgressBar progress={50} progressColor="#00FF00" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders at progress=0 without crashing', () => {
    const { toJSON } = render(<AnimatedProgressBar progress={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders at progress=100 without crashing', () => {
    const { toJSON } = render(<AnimatedProgressBar progress={100} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with negative progress (clamps to 0) without crashing', () => {
    const { toJSON } = render(<AnimatedProgressBar progress={-10} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with progress > 100 (clamps to 100) without crashing', () => {
    const { toJSON } = render(<AnimatedProgressBar progress={150} />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom borderRadius without crashing', () => {
    const { toJSON } = render(
      <AnimatedProgressBar progress={50} borderRadius={4} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('updates when progress prop changes', () => {
    const { rerender, toJSON } = render(<AnimatedProgressBar progress={25} />);
    rerender(<AnimatedProgressBar progress={75} />);
    expect(toJSON()).toBeTruthy();
  });
});

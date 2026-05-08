// HX3.3 — LazyMountBoundary tests.

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  LazyMountBoundary,
  shouldMount,
} from '../../../components/home/LazyMountBoundary';

describe('shouldMount (pure)', () => {
  it('mounts when boundary is within viewport', () => {
    // Viewport bottom = 0 + 800 = 800; boundary at y=500 → in view
    expect(shouldMount(500, 0, 800, 600)).toBe(true);
  });

  it('mounts when boundary is within triggerDistance of viewport bottom', () => {
    // Viewport bottom = 0 + 800 = 800; trigger 600 → up to y=1400 mounts
    expect(shouldMount(1400, 0, 800, 600)).toBe(true);
  });

  it('does NOT mount when boundary is far below viewport + trigger', () => {
    // Viewport bottom = 800; trigger 600 → cap at 1400; 1500 is too far
    expect(shouldMount(1500, 0, 800, 600)).toBe(false);
  });

  it('mounts as user scrolls down', () => {
    // boundaryY = 2000; viewport bottom + trigger = scrollY + 800 + 600 = scrollY + 1400
    // mount fires when scrollY + 1400 ≥ 2000 → scrollY ≥ 600
    expect(shouldMount(2000, 0, 800, 600)).toBe(false);
    expect(shouldMount(2000, 599, 800, 600)).toBe(false);
    expect(shouldMount(2000, 600, 800, 600)).toBe(true);
  });

  it('default trigger distance treats borderline cases predictably', () => {
    // boundary exactly at viewport bottom + trigger
    expect(shouldMount(1400, 0, 800, 600)).toBe(true);
    expect(shouldMount(1401, 0, 800, 600)).toBe(false);
  });
});

describe('LazyMountBoundary component', () => {
  it('does NOT render children when below viewport (uses placeholder)', () => {
    const { queryByTestId, queryByText } = render(
      <LazyMountBoundary scrollY={0} viewportHeight={800}>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    // onLayout has not fired yet — placeholder shows
    expect(queryByTestId('lazy-mount-placeholder')).toBeTruthy();
    expect(queryByText('HEAVY_CHILD')).toBeNull();
  });

  it('renders children once forceMount is true (test override)', () => {
    const { queryByText, queryByTestId } = render(
      <LazyMountBoundary scrollY={0} viewportHeight={800} forceMount>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    expect(queryByText('HEAVY_CHILD')).toBeTruthy();
    expect(queryByTestId('lazy-mount-placeholder')).toBeNull();
  });

  it('mounts children when onLayout reports an in-view y position', () => {
    const { queryByText, queryByTestId, UNSAFE_root } = render(
      <LazyMountBoundary scrollY={0} viewportHeight={800} triggerDistance={600}>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    // Placeholder is mounted; fire onLayout reporting y=300 (in-view)
    const placeholder = queryByTestId('lazy-mount-placeholder');
    expect(placeholder).toBeTruthy();
    act(() => {
      fireEvent(placeholder!, 'layout', { nativeEvent: { layout: { y: 300, x: 0, width: 200, height: 200 } } });
    });
    expect(queryByText('HEAVY_CHILD')).toBeTruthy();
    expect(UNSAFE_root).toBeDefined();
  });

  it('stays mounted once mounted (no flicker on scroll-back)', () => {
    const { queryByText, queryByTestId, rerender } = render(
      <LazyMountBoundary scrollY={500} viewportHeight={800} forceMount>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    expect(queryByText('HEAVY_CHILD')).toBeTruthy();
    // Even if scroll resets (parent scrolls back to top), keep mounted.
    rerender(
      <LazyMountBoundary scrollY={0} viewportHeight={800}>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    expect(queryByText('HEAVY_CHILD')).toBeTruthy();
    expect(queryByTestId('lazy-mount-placeholder')).toBeNull();
  });

  it('mounts when scrollY catches up via prop update', () => {
    const { queryByText, queryByTestId, rerender } = render(
      <LazyMountBoundary scrollY={0} viewportHeight={800} triggerDistance={600}>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    const placeholder = queryByTestId('lazy-mount-placeholder');
    // Boundary reports y=2000 — out of view
    act(() => {
      fireEvent(placeholder!, 'layout', { nativeEvent: { layout: { y: 2000, x: 0, width: 200, height: 200 } } });
    });
    expect(queryByText('HEAVY_CHILD')).toBeNull();
    // Now user scrolls — scrollY=1500 → 1500+800=2300 ≥ 2000-600=1400, mounts
    rerender(
      <LazyMountBoundary scrollY={1500} viewportHeight={800} triggerDistance={600}>
        <Text>HEAVY_CHILD</Text>
      </LazyMountBoundary>
    );
    expect(queryByText('HEAVY_CHILD')).toBeTruthy();
  });
});

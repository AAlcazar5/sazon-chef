// frontend/__tests__/playground/peakShadow.test.tsx
// ROADMAP 4.0 DS2.3 — playground renders both depths for comparison.

import React from 'react';
import { render } from '@testing-library/react-native';
import PeakShadowPlayground from '../../playground/peak-shadow';

describe('DS2.3 — peak-shadow playground', () => {
  it('renders without error', () => {
    expect(() => render(<PeakShadowPlayground />)).not.toThrow();
  });

  it('renders both 4px and 6px peak buttons for side-by-side comparison', () => {
    const { getByTestId } = render(<PeakShadowPlayground />);
    expect(getByTestId('peak-4')).toBeTruthy();
    expect(getByTestId('peak-6')).toBeTruthy();
    expect(getByTestId('peak-4-small')).toBeTruthy();
    expect(getByTestId('peak-6-small')).toBeTruthy();
  });

  it('each peak button has a shadow surrogate sibling', () => {
    const { getByTestId } = render(<PeakShadowPlayground />);
    expect(getByTestId('peak-4-shadow')).toBeTruthy();
    expect(getByTestId('peak-6-shadow')).toBeTruthy();
  });
});

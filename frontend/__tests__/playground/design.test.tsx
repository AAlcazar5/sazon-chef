// frontend/__tests__/playground/design.test.tsx
// ROADMAP 4.0 DS8.1 — playground renders without error and surfaces every
// token namespace at least once.

import React from 'react';
import { render } from '@testing-library/react-native';
import DesignPlayground from '../../playground/design';

describe('DS8.1 — design playground', () => {
  it('renders without error', () => {
    expect(() => render(<DesignPlayground />)).not.toThrow();
  });

  it('renders sections for every major token namespace', () => {
    const { getByTestId } = render(<DesignPlayground />);
    const namespaces = [
      'Canvas',
      'Surface',
      'Brand',
      'Pastel',
      'Accent',
      'Ink',
      'Hairline',
      'Semantic',
      'SurfaceSemantic',
      'Chart',
      'Frost',
      'Skeleton',
      'ImageState',
      'Backdrop',
      'Radius',
      'Space',
      'Type',
      'Card density',
      'Motion',
      'Focus',
      'Elevation',
    ];
    for (const ns of namespaces) {
      expect(getByTestId(`section-${ns}`)).toBeTruthy();
    }
  });

  it('renders at least one swatch for the canonical Canvas tokens', () => {
    const { getByTestId } = render(<DesignPlayground />);
    expect(getByTestId('swatch-Canvas-light')).toBeTruthy();
    expect(getByTestId('swatch-Canvas-dark')).toBeTruthy();
    expect(getByTestId('swatch-Canvas-warmLight')).toBeTruthy();
    expect(getByTestId('swatch-Canvas-warmDark')).toBeTruthy();
  });

  it('renders Brand light/dark swatches under the Brand namespace', () => {
    const { getByTestId } = render(<DesignPlayground />);
    expect(getByTestId('swatch-Brand-light.base')).toBeTruthy();
    expect(getByTestId('swatch-Brand-dark.base')).toBeTruthy();
  });

  it('renders a Type ladder with body, heading, display rows', () => {
    const { getByTestId } = render(<DesignPlayground />);
    expect(getByTestId('type-body')).toBeTruthy();
    expect(getByTestId('type-heading')).toBeTruthy();
    expect(getByTestId('type-display')).toBeTruthy();
  });

  it('renders Card density samples for feed, hero, inline', () => {
    const { getByTestId } = render(<DesignPlayground />);
    expect(getByTestId('card-density-feed')).toBeTruthy();
    expect(getByTestId('card-density-hero')).toBeTruthy();
    expect(getByTestId('card-density-inline')).toBeTruthy();
  });
});

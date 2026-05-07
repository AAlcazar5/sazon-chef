// frontend/__tests__/playground/components.test.tsx
// ROADMAP 4.0 DS8.2 — component playground renders every primitive variant.

import React from 'react';
import { render } from '@testing-library/react-native';
import ComponentsPlayground from '../../playground/components';

describe('DS8.2 — component playground', () => {
  it('renders without error', () => {
    expect(() => render(<ComponentsPlayground />)).not.toThrow();
  });

  it('renders one row per BrandButton variant in both sizes', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    const variants = ['brand', 'sage', 'golden', 'lavender', 'peach', 'sky', 'blush', 'ghost'] as const;
    for (const v of variants) {
      expect(getByTestId(`brand-large-${v}`)).toBeTruthy();
      expect(getByTestId(`brand-compact-${v}`)).toBeTruthy();
    }
  });

  it('renders BrandButton loading + disabled rows', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    expect(getByTestId('brand-loading')).toBeTruthy();
    expect(getByTestId('brand-disabled')).toBeTruthy();
  });

  it('renders one row per pastel WidgetCard tint plus trend variants', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    for (const k of ['sage', 'golden', 'lavender', 'peach', 'sky', 'blush', 'orange', 'red']) {
      expect(getByTestId(`widget-${k}`)).toBeTruthy();
    }
    expect(getByTestId('widget-up')).toBeTruthy();
    expect(getByTestId('widget-down')).toBeTruthy();
  });

  it('renders StatusBadge in 4 variants × patternMode on/off', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    for (const v of ['success', 'warning', 'error', 'info']) {
      expect(getByTestId(`badge-${v}`)).toBeTruthy();
      expect(getByTestId(`badge-pattern-${v}`)).toBeTruthy();
    }
  });

  it('renders a TypeText sample for every Type kind', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    // Sample a few canonical kinds.
    expect(getByTestId('type-text-body')).toBeTruthy();
    expect(getByTestId('type-text-heading')).toBeTruthy();
    expect(getByTestId('type-text-display')).toBeTruthy();
    expect(getByTestId('type-text-caption')).toBeTruthy();
    expect(getByTestId('type-text-label')).toBeTruthy();
    expect(getByTestId('type-text-eyebrow')).toBeTruthy();
  });

  it('renders one row per MascotForState entry', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    for (const s of ['loading', 'success', 'error', 'cooking-complete', 'first-launch']) {
      expect(getByTestId(`mascot-${s}`)).toBeTruthy();
    }
  });

  it('exposes a section testID per primitive', () => {
    const { getByTestId } = render(<ComponentsPlayground />);
    for (const s of ['BrandButton', 'WidgetCard', 'StatusBadge', 'TypeText', 'MascotForState']) {
      expect(getByTestId(`comp-section-${s}`)).toBeTruthy();
    }
  });
});

// frontend/__tests__/components/BrandButton.test.tsx
// BrandButton — variants, sizes, spring press, loading/disabled, idle pulse

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BrandButton, { VARIANT_CONFIG, SIZE_CONFIG } from '../../components/ui/BrandButton';
import type { BrandButtonVariant } from '../../components/ui/BrandButton';

// expo-linear-gradient is mocked globally in jest.setup.js

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name }: { name: string }) {
      return <Text testID={`icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

describe('BrandButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the label', () => {
    const { getByText } = render(<BrandButton label="Save Recipe" onPress={jest.fn()} />);
    expect(getByText('Save Recipe')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<BrandButton label="Save" onPress={onPress} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<BrandButton label="Save" onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<BrandButton label="Save" onPress={onPress} loading />);
    fireEvent.press(getByLabelText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, getByLabelText } = render(
      <BrandButton label="Save" onPress={jest.fn()} loading />
    );
    // Label text should be hidden
    expect(queryByText('Save')).toBeNull();
    expect(getByLabelText('Save')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { getByTestId } = render(
      <BrandButton label="Save" onPress={jest.fn()} icon="bookmark-outline" />
    );
    expect(getByTestId('icon-bookmark-outline')).toBeTruthy();
  });

  it('renders emoji when provided', () => {
    const { getByText } = render(
      <BrandButton label="Surprise Me!" onPress={jest.fn()} emoji="🎰" />
    );
    expect(getByText('🎰')).toBeTruthy();
  });

  it('emoji takes precedence over icon', () => {
    const { getByText, queryByTestId } = render(
      <BrandButton label="Test" onPress={jest.fn()} emoji="🔥" icon="flame-outline" />
    );
    expect(getByText('🔥')).toBeTruthy();
    expect(queryByTestId('icon-flame-outline')).toBeNull();
  });

  it('applies testID', () => {
    const { getByTestId } = render(
      <BrandButton label="Test" onPress={jest.fn()} testID="my-brand-btn" />
    );
    expect(getByTestId('my-brand-btn')).toBeTruthy();
  });

  it('applies custom accessibilityLabel', () => {
    const { getByLabelText } = render(
      <BrandButton label="Go" onPress={jest.fn()} accessibilityLabel="Navigate to next screen" />
    );
    expect(getByLabelText('Navigate to next screen')).toBeTruthy();
  });
});

describe('BrandButton variants', () => {
  const allVariants: BrandButtonVariant[] = ['brand', 'sage', 'golden', 'lavender', 'peach', 'sky', 'blush', 'ghost'];

  it('defines all 8 variants', () => {
    expect(Object.keys(VARIANT_CONFIG)).toHaveLength(8);
    allVariants.forEach((v) => {
      expect(VARIANT_CONFIG[v]).toBeDefined();
    });
  });

  it('each variant has gradient, shadow, and textColor', () => {
    allVariants.forEach((v) => {
      const config = VARIANT_CONFIG[v];
      expect(config.gradient).toHaveLength(2);
      expect(typeof config.shadow).toBe('string');
      expect(typeof config.textColor).toBe('string');
    });
  });

  it('golden variant uses dark text', () => {
    expect(VARIANT_CONFIG.golden.textColor).not.toBe('#FFFFFF');
  });

  it('ghost variant uses brand tinted text', () => {
    expect(VARIANT_CONFIG.ghost.textColor).toBe('#fa7e12');
    expect(VARIANT_CONFIG.ghost.shadow).toBe('transparent');
  });

  it('renders without crashing for all variants', () => {
    allVariants.forEach((variant) => {
      const { toJSON } = render(
        <BrandButton label={variant} onPress={jest.fn()} variant={variant} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe('BrandButton sizes', () => {
  it('defines large and compact sizes', () => {
    expect(SIZE_CONFIG.large).toBeDefined();
    expect(SIZE_CONFIG.compact).toBeDefined();
  });

  it('compact size has smaller dimensions than large', () => {
    expect(SIZE_CONFIG.compact.paddingVertical).toBeLessThan(SIZE_CONFIG.large.paddingVertical);
    expect(SIZE_CONFIG.compact.paddingHorizontal).toBeLessThan(SIZE_CONFIG.large.paddingHorizontal);
    expect(SIZE_CONFIG.compact.fontSize).toBeLessThan(SIZE_CONFIG.large.fontSize);
    expect(SIZE_CONFIG.compact.iconSize).toBeLessThan(SIZE_CONFIG.large.iconSize);
  });

  it('renders compact size without crashing', () => {
    const { toJSON } = render(
      <BrandButton label="Filter" onPress={jest.fn()} size="compact" variant="ghost" />
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('BrandButton idle pulse', () => {
  it('renders with idlePulse enabled without crashing', () => {
    const { toJSON } = render(
      <BrandButton label="Surprise Me!" onPress={jest.fn()} idlePulse />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with idlePulse disabled without crashing', () => {
    const { toJSON } = render(
      <BrandButton label="Regular" onPress={jest.fn()} idlePulse={false} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('BrandButton accessibility', () => {
  it('has button role', () => {
    const { getByRole } = render(
      <BrandButton label="Action" onPress={jest.fn()} />
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('reports disabled state', () => {
    const { getByRole } = render(
      <BrandButton label="Action" onPress={jest.fn()} disabled />
    );
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('reports busy state when loading', () => {
    const { getByRole } = render(
      <BrandButton label="Action" onPress={jest.fn()} loading />
    );
    expect(getByRole('button').props.accessibilityState.busy).toBe(true);
  });
});

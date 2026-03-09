// frontend/__tests__/components/ShimmerBadge.test.tsx
// Phase 4 Profile: ShimmerBadge — renders label, testID, LinearGradient present

import React from 'react';
import { render } from '@testing-library/react-native';
import ShimmerBadge from '../../components/ui/ShimmerBadge';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

describe('ShimmerBadge', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ShimmerBadge label="Premium" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label text', () => {
    const { getByText } = render(<ShimmerBadge label="✦ Premium" />);
    expect(getByText('✦ Premium')).toBeTruthy();
  });

  it('applies testID to the outer wrapper', () => {
    const { getByTestId } = render(<ShimmerBadge label="Premium" testID="premium-badge" />);
    expect(getByTestId('premium-badge')).toBeTruthy();
  });

  it('renders LinearGradient for the badge background', () => {
    const { getAllByTestId } = render(<ShimmerBadge label="Premium" />);
    expect(getAllByTestId('linear-gradient').length).toBeGreaterThanOrEqual(1);
  });

  it('renders different labels without crashing', () => {
    const { getByText } = render(<ShimmerBadge label="Pro" />);
    expect(getByText('Pro')).toBeTruthy();
  });
});

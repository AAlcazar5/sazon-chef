// frontend/__tests__/components/ScreenGradient.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import ScreenGradient from '../../components/ui/ScreenGradient';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

describe('ScreenGradient', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ScreenGradient>
        <Text>Screen Content</Text>
      </ScreenGradient>
    );
    expect(getByText('Screen Content')).toBeTruthy();
  });

  it('renders LinearGradient wrapper', () => {
    const { getByTestId } = render(
      <ScreenGradient testID="screen-gradient">
        <Text>Content</Text>
      </ScreenGradient>
    );
    expect(getByTestId('screen-gradient')).toBeTruthy();
  });

  it('accepts variant prop without crashing', () => {
    const variants = ['default', 'auth', 'onboarding', 'paywall'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(
        <ScreenGradient variant={variant}>
          <Text>{variant}</Text>
        </ScreenGradient>
      );
      unmount();
    });
  });

  it('applies custom style', () => {
    const { getByTestId } = render(
      <ScreenGradient testID="styled-gradient" style={{ paddingTop: 20 }}>
        <Text>Styled</Text>
      </ScreenGradient>
    );
    expect(getByTestId('styled-gradient')).toBeTruthy();
  });
});

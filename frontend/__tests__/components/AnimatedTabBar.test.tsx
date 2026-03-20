// frontend/__tests__/components/AnimatedTabBar.test.tsx
// Tests for AnimatedTabIcon — spring scale + opacity on focus

import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedTabIcon } from '../../components/ui/AnimatedTabBar';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, color }: { name: string; color: string }) {
      return <Text testID={`icon-${name}`}>{name}</Text>;
    },
  };
});

describe('AnimatedTabIcon', () => {
  it('renders the correct icon', () => {
    const { getByTestId } = render(
      <AnimatedTabIcon name="home-outline" color="#F97316" size={24} focused={true} />
    );
    expect(getByTestId('icon-home-outline')).toBeTruthy();
  });

  it('renders without crashing when focused', () => {
    const { getByTestId } = render(
      <AnimatedTabIcon name="book-outline" color="#F97316" size={24} focused={true} />
    );
    expect(getByTestId('icon-book-outline')).toBeTruthy();
  });

  it('renders without crashing when unfocused', () => {
    const { getByTestId } = render(
      <AnimatedTabIcon name="cart-outline" color="#6B7280" size={24} focused={false} />
    );
    expect(getByTestId('icon-cart-outline')).toBeTruthy();
  });

  it('renders different icon names correctly', () => {
    const icons = ['calendar-outline', 'person-outline', 'home-outline'];
    icons.forEach(name => {
      const { getByTestId } = render(
        <AnimatedTabIcon name={name} color="#000" size={22} focused={false} />
      );
      expect(getByTestId(`icon-${name}`)).toBeTruthy();
    });
  });
});

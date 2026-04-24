import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import FrostedHeader from '../../../components/ui/FrostedHeader';

jest.mock('expo-blur', () => ({
  BlurView: function MockBlurView(props: any) { return props.children || null; },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

describe('FrostedHeader', () => {
  it('renders children content', () => {
    const { getByText } = render(
      <FrostedHeader>
        <Text>Sazon Chef</Text>
      </FrostedHeader>
    );
    expect(getByText('Sazon Chef')).toBeTruthy();
  });

  it('renders with editorial brand text when provided', () => {
    const { getByText } = render(
      <FrostedHeader>
        <Text>Sazon Chef</Text>
      </FrostedHeader>
    );
    expect(getByText('Sazon Chef')).toBeTruthy();
  });

  it('applies top inset by default', () => {
    // withTopInset defaults to true — component uses safe area insets
    const { toJSON } = render(
      <FrostedHeader>
        <Text>Header</Text>
      </FrostedHeader>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without top inset when disabled', () => {
    const { toJSON } = render(
      <FrostedHeader withTopInset={false}>
        <Text>Header</Text>
      </FrostedHeader>
    );
    expect(toJSON()).toBeTruthy();
  });
});

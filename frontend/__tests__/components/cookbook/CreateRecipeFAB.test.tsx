// frontend/__tests__/components/cookbook/CreateRecipeFAB.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CreateRecipeFAB from '../../../components/cookbook/CreateRecipeFAB';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

describe('CreateRecipeFAB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<CreateRecipeFAB onPress={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders "Create" label', () => {
    const { getByText } = render(<CreateRecipeFAB onPress={jest.fn()} />);
    expect(getByText('Create')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<CreateRecipeFAB onPress={onPress} />);
    fireEvent.press(getByText('Create'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibilityLabel', () => {
    const { getByLabelText } = render(<CreateRecipeFAB onPress={jest.fn()} />);
    expect(getByLabelText('Create a new recipe')).toBeTruthy();
  });

  it('exposes a testID for cookbook integration', () => {
    const { getByTestId } = render(<CreateRecipeFAB onPress={jest.fn()} />);
    expect(getByTestId('create-recipe-fab')).toBeTruthy();
  });
});

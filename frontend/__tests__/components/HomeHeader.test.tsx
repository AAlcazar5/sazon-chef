// frontend/__tests__/components/HomeHeader.test.tsx
// HomeHeader — Sazon-mascot logo + brand title + ProfileAvatarButton.
// Filter button moved to inline FilterRow (R6).

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeHeader from '../../components/home/HomeHeader';

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: function MockBlurView(props: any) {
      return <View testID="blur-view" {...props} />;
    },
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

jest.mock('../../components/mascot/Sazon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockSazon() { return <View testID="sazon-mascot" />; },
  };
});

const defaultProps = {
  onMascotPress: jest.fn(),
};

describe('HomeHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Sazon mascot', () => {
    const { getByTestId } = render(<HomeHeader {...defaultProps} />);
    expect(getByTestId('sazon-mascot')).toBeTruthy();
  });

  it('renders "Sazon" + italic "Chef" brand text', () => {
    const { getByText } = render(<HomeHeader {...defaultProps} />);
    expect(getByText(/Sazon/)).toBeTruthy();
    expect(getByText('Chef')).toBeTruthy();
  });

  it('calls onMascotPress when logo is tapped', () => {
    const { getByText } = render(<HomeHeader {...defaultProps} />);
    fireEvent.press(getByText(/Sazon/));
    expect(defaultProps.onMascotPress).toHaveBeenCalled();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<HomeHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts deprecated onFilterPress / activeFilterCount for back-compat', () => {
    const { toJSON } = render(
      <HomeHeader {...defaultProps} onFilterPress={() => {}} activeFilterCount={2} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders a Surprise Me pill when onSurpriseMe is provided', () => {
    const onSurpriseMe = jest.fn();
    const { getByLabelText } = render(
      <HomeHeader {...defaultProps} onSurpriseMe={onSurpriseMe} />,
    );
    expect(getByLabelText('Surprise Me')).toBeTruthy();
  });
});

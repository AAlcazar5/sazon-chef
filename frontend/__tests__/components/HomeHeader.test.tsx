// frontend/__tests__/components/HomeHeader.test.tsx
// HomeHeader — logo + brand name + animated filters button

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
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

jest.mock('../../components/mascot', () => {
  const { View } = require('react-native');
  return {
    LogoMascot: function MockLogoMascot() { return <View testID="logo-mascot" />; },
  };
});

const defaultProps = {
  onMascotPress: jest.fn(),
};

describe('HomeHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the logo mascot', () => {
    const { getByTestId } = render(<HomeHeader {...defaultProps} />);
    expect(getByTestId('logo-mascot')).toBeTruthy();
  });

  it('renders "Sazon Chef" brand text', () => {
    const { getByText } = render(<HomeHeader {...defaultProps} />);
    expect(getByText('Sazon Chef')).toBeTruthy();
  });

  it('calls onMascotPress when logo is tapped', () => {
    const { UNSAFE_getAllByType } = render(<HomeHeader {...defaultProps} />);
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(defaultProps.onMascotPress).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<HomeHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  describe('Filters button', () => {
    it('does not render filters button when onFilterPress is not provided', () => {
      const { queryByText } = render(<HomeHeader {...defaultProps} />);
      expect(queryByText('Filters')).toBeNull();
    });

    it('renders filters button when onFilterPress is provided', () => {
      const { getByText } = render(
        <HomeHeader {...defaultProps} onFilterPress={jest.fn()} />
      );
      expect(getByText('Filters')).toBeTruthy();
    });

    it('calls onFilterPress when filters button is tapped', () => {
      const onFilterPress = jest.fn();
      const { getByText } = render(
        <HomeHeader {...defaultProps} onFilterPress={onFilterPress} />
      );
      fireEvent.press(getByText('Filters'));
      expect(onFilterPress).toHaveBeenCalledTimes(1);
    });

    it('shows active filter count badge when activeFilterCount > 0', () => {
      const { getByText } = render(
        <HomeHeader
          {...defaultProps}
          onFilterPress={jest.fn()}
          activeFilterCount={3}
        />
      );
      expect(getByText('3')).toBeTruthy();
    });

    it('shows badge with 0 when activeFilterCount is 0', () => {
      const { getByText } = render(
        <HomeHeader
          {...defaultProps}
          onFilterPress={jest.fn()}
          activeFilterCount={0}
        />
      );
      expect(getByText('0')).toBeTruthy();
    });

    it('has correct accessibility label with active filters', () => {
      const { getByLabelText } = render(
        <HomeHeader
          {...defaultProps}
          onFilterPress={jest.fn()}
          activeFilterCount={2}
        />
      );
      expect(getByLabelText('Filters, 2 active')).toBeTruthy();
    });

    it('has correct accessibility label without active filters', () => {
      const { getByLabelText } = render(
        <HomeHeader
          {...defaultProps}
          onFilterPress={jest.fn()}
          activeFilterCount={0}
        />
      );
      expect(getByLabelText('Filters, 0 active')).toBeTruthy();
    });
  });
});

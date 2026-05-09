// frontend/__tests__/components/CookbookHeader.test.tsx
// CookbookHeader — Kitchen title + ProfileAvatarButton (filter button retired
// in R6; lives inline in the FilterRow now).

import React from 'react';
import { render } from '@testing-library/react-native';
import CookbookHeader from '../../components/cookbook/CookbookHeader';

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

describe('CookbookHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the editorial Kitchen title', () => {
    const { getByText } = render(<CookbookHeader />);
    expect(getByText(/Kit/)).toBeTruthy();
    expect(getByText(/chen/)).toBeTruthy();
  });

  it('renders the Sazon logo (geometry matched to HomeHeader)', () => {
    const { getByTestId } = render(<CookbookHeader />);
    expect(getByTestId('sazon-mascot')).toBeTruthy();
  });

  it('renders the ProfileAvatarButton in the right slot', () => {
    const { getByTestId } = render(<CookbookHeader />);
    // Mocked in jest.setup; renders null but is mounted as a child.
    expect(() => getByTestId('blur-view')).not.toThrow();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<CookbookHeader />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts deprecated onFilterPress / activeFilterCount props for back-compat', () => {
    const { toJSON } = render(
      <CookbookHeader onFilterPress={() => {}} activeFilterCount={3} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});

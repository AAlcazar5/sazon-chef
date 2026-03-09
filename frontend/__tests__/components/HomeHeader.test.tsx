// frontend/__tests__/components/HomeHeader.test.tsx
// Phase 4: HomeHeader — logo, brand name, view mode toggle

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

jest.mock('../../components/mascot', () => {
  const { View } = require('react-native');
  return {
    LogoMascot: function MockLogoMascot() { return <View testID="logo-mascot" />; },
  };
});

const defaultProps = {
  viewMode: 'list' as const,
  onToggleViewMode: jest.fn(),
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

  it('renders view mode toggle buttons', () => {
    const { toJSON } = render(<HomeHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onMascotPress when logo is tapped', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<HomeHeader {...defaultProps} />);
    // First touchable wraps the logo
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(defaultProps.onMascotPress).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleViewMode with "grid" when grid button pressed', () => {
    const { UNSAFE_getAllByType } = render(<HomeHeader {...defaultProps} />);
    // View mode toggles: list button (index 1) then grid button (index 2)
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(buttons[buttons.length - 1]); // last = grid
    expect(defaultProps.onToggleViewMode).toHaveBeenCalledWith('grid');
  });

  it('renders without crashing when scrollY not provided', () => {
    const { toJSON } = render(<HomeHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders search input in collapsed header', () => {
    const { getByPlaceholderText } = render(<HomeHeader {...defaultProps} />);
    expect(getByPlaceholderText('Search recipes...')).toBeTruthy();
  });

  it('calls onSearchChange when text is entered in header search', () => {
    const onSearchChange = jest.fn();
    const { getByPlaceholderText } = render(
      <HomeHeader {...defaultProps} searchValue="" onSearchChange={onSearchChange} />,
    );
    fireEvent.changeText(getByPlaceholderText('Search recipes...'), 'tacos');
    expect(onSearchChange).toHaveBeenCalledWith('tacos');
  });

  it('shows clear button when searchValue is non-empty', () => {
    const { UNSAFE_getAllByType } = render(
      <HomeHeader {...defaultProps} searchValue="tacos" onSearchChange={jest.fn()} />,
    );
    // Buttons: mascot, clear (in search), list, grid
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    expect(buttons.length).toBe(4);
  });

  it('calls onSearchChange with empty string when clear is pressed', () => {
    const onSearchChange = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <HomeHeader {...defaultProps} searchValue="tacos" onSearchChange={onSearchChange} />,
    );
    // Buttons: mascot(0), clear(1), list(2), grid(3)
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(buttons[1]);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});

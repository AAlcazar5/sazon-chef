// Group 10I: CookingJourneyEditSheet tests — cuisine toggle, skill select, save.

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style, disabled }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../components/ui/BottomSheet', () => {
  return function MockBottomSheet({ visible, children }: any) {
    if (!visible) return null;
    const { View } = require('react-native');
    return require('react').createElement(View, { testID: 'mock-bottom-sheet' }, children);
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CookingJourneyEditSheet from '../../components/profile/CookingJourneyEditSheet';

describe('CookingJourneyEditSheet', () => {
  test('toggles cuisines and saves current selection + skill', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    const { getByTestId } = render(
      <CookingJourneyEditSheet
        visible
        onClose={onClose}
        initialCuisines={['Italian']}
        initialSkillLevel="beginner"
        onSave={onSave}
      />,
    );

    fireEvent.press(getByTestId('edit-cuisine-Thai'));
    fireEvent.press(getByTestId('edit-cuisine-Italian'));
    fireEvent.press(getByTestId('edit-skill-home_cook'));

    await act(async () => {
      fireEvent.press(getByTestId('edit-save'));
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      seededCuisines: ['Thai'],
      cookingSkillLevel: 'home_cook',
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <CookingJourneyEditSheet
        visible={false}
        onClose={jest.fn()}
        initialCuisines={[]}
        initialSkillLevel="beginner"
        onSave={jest.fn()}
      />,
    );
    expect(queryByTestId('mock-bottom-sheet')).toBeNull();
  });
});

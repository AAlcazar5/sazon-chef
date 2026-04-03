// frontend/__tests__/components/ProfileStatWidgets.test.tsx
// Tests for ProfileStatWidgets (stat grid + activity calendar heat map) (9L)

import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import ProfileStatWidgets from '../../components/profile/ProfileStatWidgets';

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
    useReducedMotion: () => false,
  };
  return Reanimated;
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Svg: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
    Defs: (props: any) => <View {...props} />,
    LinearGradient: (props: any) => <View {...props} />,
    Stop: (props: any) => <View {...props} />,
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock AccessibilityInfo
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(false));
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));

describe('ProfileStatWidgets', () => {
  it('renders the widget grid with correct data', () => {
    const { getByTestId } = render(
      <ProfileStatWidgets
        savedRecipes={42}
        mealsCooked={15}
        mealPlans={3}
        isDark={false}
        testID="profile-stat-widgets"
      />
    );
    expect(getByTestId('profile-stat-widgets')).toBeTruthy();
    expect(getByTestId('profile-widget-grid')).toBeTruthy();
    expect(getByTestId('widget-streak')).toBeTruthy();
    expect(getByTestId('widget-cooked')).toBeTruthy();
    expect(getByTestId('widget-saved')).toBeTruthy();
    expect(getByTestId('widget-plans')).toBeTruthy();
  });

  it('shows activity calendar when cookingDates provided', () => {
    const today = new Date().toISOString().split('T')[0];
    const { getByText } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        cookingDates={[today]}
        isDark={false}
      />
    );
    // Streak should show "day streak" text
    expect(getByText('day streak')).toBeTruthy();
  });

  it('hides activity calendar when no cookingDates', () => {
    const { queryByText } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        isDark={false}
      />
    );
    // No calendar, so no "day streak" text from the calendar component
    expect(queryByText('day streak')).toBeNull();
  });

  it('renders correctly in dark mode', () => {
    const { getByTestId } = render(
      <ProfileStatWidgets
        savedRecipes={20}
        mealsCooked={8}
        mealPlans={2}
        isDark={true}
        testID="profile-dark"
      />
    );
    expect(getByTestId('profile-dark')).toBeTruthy();
  });

  it('calculates streak from consecutive dates', () => {
    const dates: string[] = [];
    const today = new Date();
    // 5 consecutive days ending today
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { getByTestId } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        cookingDates={dates}
        isDark={false}
        testID="streak-test"
      />
    );
    expect(getByTestId('streak-test')).toBeTruthy();
  });

  it('shows weekly comparison cards when cookingDates provided', () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { getByTestId, getByText } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        cookingDates={dates}
        isDark={false}
      />
    );
    expect(getByTestId('weekly-comparison')).toBeTruthy();
    expect(getByText('Weekly Progress')).toBeTruthy();
    expect(getByText('This Week')).toBeTruthy();
    expect(getByText('Active Days')).toBeTruthy();
  });

  it('hides weekly comparison when no cookingDates', () => {
    const { queryByTestId } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        isDark={false}
      />
    );
    expect(queryByTestId('weekly-comparison')).toBeNull();
  });

  it('shows "vs" last week text in comparison card', () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { getByText } = render(
      <ProfileStatWidgets
        savedRecipes={10}
        mealsCooked={5}
        mealPlans={1}
        cookingDates={dates}
        isDark={false}
      />
    );
    // Should show the "vs X last week" sub-text
    expect(getByText(/vs \d+ last week/)).toBeTruthy();
  });
});

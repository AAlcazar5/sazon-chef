// frontend/__tests__/components/DailyMacrosSummary.test.tsx
// Tests for DailyMacrosSummary including sparkline progressive disclosure (9L)

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import DailyMacrosSummary from '../../components/meal-plan/DailyMacrosSummary';

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
    Polyline: (props: any) => <View {...props} />,
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

// Mock mascot
jest.mock('../../components/mascot', () => {
  const { View } = require('react-native');
  return {
    AnimatedLogoMascot: function MockAnimatedLogoMascot({ expression }: any) {
      return <View testID={`mascot-${expression}`} />;
    },
  };
});

// Mock AccessibilityInfo
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(false));
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as any);

const defaultMacros = { calories: 1500, protein: 120, carbs: 200, fat: 60 };
const targetMacros = { calories: 2000, protein: 150, carbs: 250, fat: 80 };
const getMacroColor = () => ({ color: '#000' });

function buildWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function buildWeeklyPlan(weekDates: Date[]) {
  const plan: any = {};
  weekDates.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    plan[dateStr] = {
      meals: {
        breakfast: { recipe: { calories: 400, protein: 30, carbs: 50, fat: 15 } },
        lunch: { recipe: { calories: 600, protein: 40, carbs: 70, fat: 20 } },
        dinner: { recipe: { calories: 500, protein: 35, carbs: 60, fat: 18 } },
      },
    };
  });
  return { weeklyPlan: plan };
}

describe('DailyMacrosSummary', () => {
  it('renders expanded view with macro widget grid', () => {
    const { getByTestId } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={true}
        isDark={false}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
      />
    );
    expect(getByTestId('macro-widget-grid')).toBeTruthy();
    expect(getByTestId('calorie-progress-ring')).toBeTruthy();
  });

  it('renders collapsed view with compact mini cards', () => {
    const { queryByTestId, getByText } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={false}
        isDark={false}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
      />
    );
    expect(queryByTestId('macro-widget-grid')).toBeNull();
    expect(getByText('Protein')).toBeTruthy();
  });

  it('does not show sparkline when no weekly data', () => {
    const { queryByTestId } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={true}
        isDark={false}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
      />
    );
    expect(queryByTestId('sparkline-container')).toBeNull();
  });

  it('shows sparkline when macro card tapped with weekly data', () => {
    const weekDates = buildWeekDates();
    const weeklyPlan = buildWeeklyPlan(weekDates);

    const { getByTestId, getByText } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={true}
        isDark={false}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
        weeklyPlan={weeklyPlan}
        weekDates={weekDates}
      />
    );

    // Tap the protein widget card
    const proteinWidget = getByTestId('widget-protein');
    fireEvent.press(proteinWidget);

    // Sparkline should appear
    expect(getByTestId('sparkline-container')).toBeTruthy();
    expect(getByText(/Protein — Weekly Trend/)).toBeTruthy();
  });

  it('toggles sparkline off when same card tapped again', () => {
    const weekDates = buildWeekDates();
    const weeklyPlan = buildWeeklyPlan(weekDates);

    const { getByTestId, queryByTestId } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={true}
        isDark={false}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
        weeklyPlan={weeklyPlan}
        weekDates={weekDates}
      />
    );

    const proteinWidget = getByTestId('widget-protein');
    fireEvent.press(proteinWidget);
    expect(getByTestId('sparkline-container')).toBeTruthy();

    // Tap again to dismiss
    fireEvent.press(proteinWidget);
    expect(queryByTestId('sparkline-container')).toBeNull();
  });

  it('renders in dark mode without crashing', () => {
    const { getByTestId } = render(
      <DailyMacrosSummary
        dailyMacros={defaultMacros}
        targetMacros={targetMacros}
        formattedDate="Mon, Mar 23"
        macrosExpanded={true}
        isDark={true}
        onToggleExpanded={jest.fn()}
        getMacroColor={getMacroColor}
      />
    );
    expect(getByTestId('macro-widget-grid')).toBeTruthy();
  });
});

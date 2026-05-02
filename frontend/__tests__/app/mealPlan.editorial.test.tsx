import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks
jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockSvg({ children, ...props }: any) { return <View {...props}>{children}</View>; },
    Circle: function MockCircle(props: any) { return <View {...props} />; },
  };
});

// Import after mocks
import { EditorialMealPlanHeader } from '../../components/mealPlan/EditorialMealPlanHeader';
import { WeekStrip } from '../../components/mealPlan/WeekStrip';
import { MacroBudgetHeader } from '../../components/mealPlan/MacroBudgetHeader';
import { MacroSummaryCard } from '../../components/mealPlan/MacroSummaryCard';
import { TodaysPlanSection } from '../../components/mealPlan/TodaysPlanSection';
import { MealSlotCard } from '../../components/mealPlan/MealSlotCard';

// ─── EditorialMealPlanHeader ─────────────────────────────────

describe('EditorialMealPlanHeader (10V-F: Eyebrow + title)', () => {
  it('renders month and week number in eyebrow', () => {
    const { getByText } = render(<EditorialMealPlanHeader month="April" weekNumber={16} />);
    expect(getByText(/APRIL · WEEK 16/)).toBeTruthy();
  });

  it('renders title with italic "week"', () => {
    const { getByText } = render(<EditorialMealPlanHeader month="April" weekNumber={16} />);
    expect(getByText(/week/)).toBeTruthy();
  });

  it('does not render trailing period after title', () => {
    const { queryByText } = render(<EditorialMealPlanHeader month="April" weekNumber={16} />);
    expect(queryByText('.')).toBeNull();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<EditorialMealPlanHeader month="April" weekNumber={16} />);
    expect(getByText(/Four meals a day/)).toBeTruthy();
  });
});

// ─── WeekStrip ───────────────────────────────────────────────

describe('WeekStrip (10V-F: Week strip)', () => {
  const days = [
    { dayAbbrev: 'Mon', dateNumber: 21, dateKey: '2026-04-21' },
    { dayAbbrev: 'Tue', dateNumber: 22, dateKey: '2026-04-22' },
    { dayAbbrev: 'Wed', dateNumber: 23, dateKey: '2026-04-23' },
    { dayAbbrev: 'Thu', dateNumber: 24, dateKey: '2026-04-24' },
    { dayAbbrev: 'Fri', dateNumber: 25, dateKey: '2026-04-25' },
    { dayAbbrev: 'Sat', dateNumber: 26, dateKey: '2026-04-26' },
    { dayAbbrev: 'Sun', dateNumber: 27, dateKey: '2026-04-27' },
  ];

  it('renders 7 day columns', () => {
    const { getByTestId } = render(
      <WeekStrip days={days} activeKey="2026-04-23" onDayPress={jest.fn()} />
    );
    days.forEach((d) => {
      expect(getByTestId(`day-${d.dateKey}`)).toBeTruthy();
    });
  });

  it('active day has orange dot indicator', () => {
    const { getByTestId } = render(
      <WeekStrip days={days} activeKey="2026-04-23" onDayPress={jest.fn()} />
    );
    expect(getByTestId('active-dot')).toBeTruthy();
  });

  it('tapping a day fires onDayPress', () => {
    const onDayPress = jest.fn();
    const { getByTestId } = render(
      <WeekStrip days={days} activeKey="2026-04-23" onDayPress={onDayPress} />
    );
    fireEvent.press(getByTestId('day-2026-04-25'));
    expect(onDayPress).toHaveBeenCalledWith('2026-04-25');
  });
});

// ─── MacroBudgetHeader ───────────────────────────────────────

describe('MacroBudgetHeader (10V-F: Macro budget section)', () => {
  it('renders day name in eyebrow', () => {
    const { getByText } = render(<MacroBudgetHeader dayName="Wednesday" onTrackPercent={79} />);
    expect(getByText(/WEDNESDAY · MACRO BUDGET/)).toBeTruthy();
  });

  it('renders on-track % badge', () => {
    const { getByText } = render(<MacroBudgetHeader dayName="Wednesday" onTrackPercent={79} />);
    expect(getByText('79% on track')).toBeTruthy();
  });
});

// ─── MacroSummaryCard ────────────────────────────────────────

describe('MacroSummaryCard (10V-F: Macro summary)', () => {
  const macros = {
    calories: { value: 1420, goal: 1800 },
    protein: { value: 98, goal: 120 },
    carbs: { value: 180, goal: 250 },
    fat: { value: 45, goal: 65 },
    fiber: { value: 18, goal: 30 },
  };

  it('renders calorie ring', () => {
    const { getByTestId } = render(<MacroSummaryCard {...macros} />);
    expect(getByTestId('calorie-ring')).toBeTruthy();
  });

  it('renders 4 macro bars', () => {
    const { getByTestId } = render(<MacroSummaryCard {...macros} />);
    expect(getByTestId('macro-protein-fill')).toBeTruthy();
    expect(getByTestId('macro-carbs-fill')).toBeTruthy();
    expect(getByTestId('macro-fat-fill')).toBeTruthy();
    expect(getByTestId('macro-fiber-fill')).toBeTruthy();
  });

  it('renders consumed/goal values', () => {
    const { getByText } = render(<MacroSummaryCard {...macros} />);
    expect(getByText('1,420')).toBeTruthy();
    expect(getByText('OF 1,800')).toBeTruthy();
  });
});

// ─── TodaysPlanSection ───────────────────────────────────────

describe('TodaysPlanSection (10V-F: Today\'s plan)', () => {
  it('renders section title with italic accent', () => {
    const { getByText } = render(
      <TodaysPlanSection onAutoplan={jest.fn()}>
        <></>
      </TodaysPlanSection>
    );
    expect(getByText(/Today's/)).toBeTruthy();
    expect(getByText(/plan/)).toBeTruthy();
  });

  it('renders AUTO-PLAN link', () => {
    const { getByText } = render(
      <TodaysPlanSection onAutoplan={jest.fn()}>
        <></>
      </TodaysPlanSection>
    );
    expect(getByText('AUTO-PLAN')).toBeTruthy();
  });

  it('tap fires onAutoplan', () => {
    const onAutoplan = jest.fn();
    const { getByTestId } = render(
      <TodaysPlanSection onAutoplan={onAutoplan}>
        <></>
      </TodaysPlanSection>
    );
    fireEvent.press(getByTestId('auto-plan-button'));
    expect(onAutoplan).toHaveBeenCalled();
  });
});

// ─── MealSlotCard ────────────────────────────────────────────

describe('MealSlotCard (10V-F: Meal slot cards)', () => {
  it('renders filled slot with time, meal type, title, and macros', () => {
    const recipe = {
      id: '1',
      title: 'Teriyaki Bowl',
      calories: 420,
      protein: 22,
      cookTime: 20,
    };
    const { getByText } = render(
      <MealSlotCard time="7:30 AM" mealType="Breakfast" recipe={recipe} onPress={jest.fn()} />
    );
    expect(getByText('7:30 AM')).toBeTruthy();
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Teriyaki Bowl')).toBeTruthy();
    expect(getByText(/420 · 22g protein · 20 min/)).toBeTruthy();
  });

  it('renders empty slot with placeholder', () => {
    const { getByText } = render(
      <MealSlotCard time="12:00 PM" mealType="Lunch" onPress={jest.fn()} />
    );
    expect(getByText('Tap to add a recipe')).toBeTruthy();
  });

  it('tap fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MealSlotCard time="7:00 PM" mealType="Dinner" onPress={onPress} />
    );
    fireEvent.press(getByTestId('meal-slot-dinner'));
    expect(onPress).toHaveBeenCalled();
  });
});

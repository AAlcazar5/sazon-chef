// frontend/__tests__/components/WeeklyCalendar.test.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import WeeklyCalendar from '../../components/meal-plan/WeeklyCalendar';

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn() },
}));

// Build a 7-day week starting from a fixed Monday
function makeWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const MONDAY = new Date('2025-01-06'); // A known Monday
const weekDates = makeWeekDates(MONDAY);
const selectedDate = weekDates[0]; // Monday selected

const defaultProps = {
  weekDates,
  selectedDate,
  weeklyPlan: null,
  isDark: false,
  isToday: (date: Date) => false,
  isSelected: (date: Date) => date.toDateString() === selectedDate.toDateString(),
  onSelectDate: jest.fn(),
  onPreviousWeek: jest.fn(),
  onNextWeek: jest.fn(),
  onShowDayMeals: jest.fn(),
  onRegenerateDay: jest.fn(),
};

describe('WeeklyCalendar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders 7 day pills', () => {
    const { getAllByText } = render(<WeeklyCalendar {...defaultProps} />);
    // Each day renders its date number (1–31). Monday Jan 6 = "6"
    expect(getAllByText('6').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 7 abbreviated weekday labels', () => {
    const { getByText } = render(<WeeklyCalendar {...defaultProps} />);
    // Mon Jan 6 is a Monday
    expect(getByText('Mon')).toBeTruthy();
    expect(getByText('Tue')).toBeTruthy();
    expect(getByText('Wed')).toBeTruthy();
    expect(getByText('Thu')).toBeTruthy();
    expect(getByText('Fri')).toBeTruthy();
    expect(getByText('Sat')).toBeTruthy();
    expect(getByText('Sun')).toBeTruthy();
  });

  it('calls onPreviousWeek when back chevron is pressed', () => {
    const onPreviousWeek = jest.fn();
    const { getByText } = render(
      <WeeklyCalendar {...defaultProps} onPreviousWeek={onPreviousWeek} />
    );
    fireEvent.press(getByText('Previous week'));
    expect(onPreviousWeek).toHaveBeenCalled();
  });

  it('calls onNextWeek when forward chevron is pressed', () => {
    const onNextWeek = jest.fn();
    const { getByText } = render(
      <WeeklyCalendar {...defaultProps} onNextWeek={onNextWeek} />
    );
    fireEvent.press(getByText('Next week'));
    expect(onNextWeek).toHaveBeenCalled();
  });

  it('calls onSelectDate when a day pill is pressed', () => {
    const onSelectDate = jest.fn();
    const { getByText } = render(
      <WeeklyCalendar {...defaultProps} onSelectDate={onSelectDate} />
    );
    fireEvent.press(getByText('Tue')); // Tuesday Jan 7
    expect(onSelectDate).toHaveBeenCalled();
  });

  it('calls onShowDayMeals when a day with meals is pressed', () => {
    const onShowDayMeals = jest.fn();
    const dateStr = weekDates[1].toISOString().split('T')[0]; // Tuesday
    const weeklyPlanWithMeals = {
      weeklyPlan: {
        [dateStr]: {
          meals: { breakfast: { id: 'b1', title: 'Oatmeal' } },
          mealPrepSessions: [],
        },
      },
    };
    const { UNSAFE_getAllByType } = render(
      <WeeklyCalendar
        {...defaultProps}
        weeklyPlan={weeklyPlanWithMeals}
        onShowDayMeals={onShowDayMeals}
      />
    );
    // TouchableOpacity layout: [0]=prev chevron, [1]=next chevron, [2]=Mon, [3]=Tue, ...
    const pills = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(pills[3]); // Tuesday
    expect(onShowDayMeals).toHaveBeenCalled();
  });

  it('does NOT call onShowDayMeals for a day with no meals', () => {
    const onShowDayMeals = jest.fn();
    const { getByText } = render(
      <WeeklyCalendar
        {...defaultProps}
        weeklyPlan={null}
        onShowDayMeals={onShowDayMeals}
      />
    );
    fireEvent.press(getByText('Tue'));
    expect(onShowDayMeals).not.toHaveBeenCalled();
  });

  it('shows meal count badge for days with meals', () => {
    const dateStr = weekDates[2].toISOString().split('T')[0]; // Wednesday
    const weeklyPlanWithMeals = {
      weeklyPlan: {
        [dateStr]: {
          meals: {
            breakfast: { id: 'b1' },
            lunch: { id: 'l1' },
            dinner: { id: 'd1' },
          },
          mealPrepSessions: [],
        },
      },
    };
    const { getByText } = render(
      <WeeklyCalendar {...defaultProps} weeklyPlan={weeklyPlanWithMeals} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('shows meal prep badge when mealPrepSessions exist', () => {
    const dateStr = weekDates[3].toISOString().split('T')[0]; // Thursday
    const weeklyPlanWithPrep = {
      weeklyPlan: {
        [dateStr]: {
          meals: { dinner: { id: 'd1' } },
          mealPrepSessions: [{ id: 'prep-1' }],
        },
      },
    };
    const { getByText } = render(
      <WeeklyCalendar {...defaultProps} weeklyPlan={weeklyPlanWithPrep} />
    );
    expect(getByText('🍱 Prep')).toBeTruthy();
  });

  it('calls onRegenerateDay on long-press of a day with meals', () => {
    const onRegenerateDay = jest.fn();
    const dateStr = weekDates[4].toISOString().split('T')[0]; // Friday
    const weeklyPlanWithMeals = {
      weeklyPlan: {
        [dateStr]: {
          meals: { dinner: { id: 'd1' } },
          mealPrepSessions: [],
        },
      },
    };
    const { UNSAFE_getAllByType } = render(
      <WeeklyCalendar
        {...defaultProps}
        weeklyPlan={weeklyPlanWithMeals}
        onRegenerateDay={onRegenerateDay}
      />
    );
    // [0]=prev, [1]=next, [2]=Mon, [3]=Tue, [4]=Wed, [5]=Thu, [6]=Fri
    const pills = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent(pills[6], 'longPress'); // Friday
    expect(onRegenerateDay).toHaveBeenCalled();
  });

  it('applies today border to the current day', () => {
    const todayDate = weekDates[1]; // Tuesday — not the selected day, so border shows
    const { UNSAFE_getAllByType } = render(
      <WeeklyCalendar
        {...defaultProps}
        isToday={(date) => date.toDateString() === todayDate.toDateString()}
      />
    );
    // [0]=prev chevron, [1]=next chevron, [2]=Mon, [3]=Tue (today, not selected)
    // DayPill uses style={{ borderWidth: isToday && !isSelected ? 2 : 0 }}
    // style may be an array — flatten and check any element has borderWidth 2
    const pills = UNSAFE_getAllByType(TouchableOpacity);
    const styles = [].concat(pills[3].props.style).filter(Boolean);
    expect(styles.some((s) => s.borderWidth === 2)).toBe(true);
  });

  it('renders the "Weekly Meal Plan" header', () => {
    const { getByText } = render(<WeeklyCalendar {...defaultProps} />);
    expect(getByText('Weekly Meal Plan')).toBeTruthy();
  });
});

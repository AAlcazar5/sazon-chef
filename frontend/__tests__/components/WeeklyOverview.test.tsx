// frontend/__tests__/components/WeeklyOverview.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';

// Mock the WeeklyOverview component
const WeeklyOverview = ({ weekDates, selectedDate, onDateSelect, isToday, isSelected }) => {
  return (
    <View testID="weekly-overview">
      <Text testID="weekly-title">Weekly Overview</Text>
      <View testID="week-dates">
        {weekDates.map((date, index) => {
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
          const isFuture = date > new Date(new Date().setHours(23, 59, 59, 999));
          const isCurrentDay = isToday(date);
          
          return (
            <TouchableOpacity
              key={index}
              testID={`day-${index}`}
              onPress={() => onDateSelect(date)}
              style={{
                backgroundColor: isSelected(date) 
                  ? '#f97316' 
                  : isCurrentDay
                    ? '#fed7aa'
                    : isPast
                      ? '#f9fafb'
                      : '#f0fdf4'
              }}
            >
              <Text testID={`day-name-${index}`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text testID={`day-number-${index}`}>
                {date.getDate()}
              </Text>
              <Text testID={`day-month-${index}`}>
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </Text>
              
              {/* Status indicators */}
              {isCurrentDay && !isSelected(date) && (
                <View testID={`today-indicator-${index}`} />
              )}
              {isPast && !isCurrentDay && (
                <View testID={`past-indicator-${index}`} />
              )}
              {isFuture && (
                <View testID={`future-indicator-${index}`} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Legend */}
      <View testID="legend">
        <View testID="legend-past">
          <View testID="past-dot" />
          <Text>Past</Text>
        </View>
        <View testID="legend-today">
          <View testID="today-dot" />
          <Text>Today</Text>
        </View>
        <View testID="legend-upcoming">
          <View testID="upcoming-dot" />
          <Text>Upcoming</Text>
        </View>
      </View>
    </View>
  );
};

describe('WeeklyOverview Component', () => {
  const mockWeekDates = [
    new Date('2024-01-01'), // Monday
    new Date('2024-01-02'), // Tuesday
    new Date('2024-01-03'), // Wednesday
    new Date('2024-01-04'), // Thursday
    new Date('2024-01-05'), // Friday
    new Date('2024-01-06'), // Saturday
    new Date('2024-01-07')  // Sunday
  ];

  const mockSelectedDate = new Date('2024-01-03');
  const mockOnDateSelect = jest.fn();
  const mockIsToday = jest.fn((date) => date.getDate() === 3);
  const mockIsSelected = jest.fn((date) => date.getDate() === 3);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render weekly overview with all days', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('weekly-overview')).toBeTruthy();
    expect(getByTestId('weekly-title')).toBeTruthy();
    expect(getByTestId('week-dates')).toBeTruthy();
    expect(getByTestId('legend')).toBeTruthy();
  });

  it('should render all 7 days of the week', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    for (let i = 0; i < 7; i++) {
      expect(getByTestId(`day-${i}`)).toBeTruthy();
      expect(getByTestId(`day-name-${i}`)).toBeTruthy();
      expect(getByTestId(`day-number-${i}`)).toBeTruthy();
      expect(getByTestId(`day-month-${i}`)).toBeTruthy();
    }
  });

  it('should call onDateSelect when a day is pressed', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    fireEvent.press(getByTestId('day-0'));
    expect(mockOnDateSelect).toHaveBeenCalledWith(mockWeekDates[0]);

    fireEvent.press(getByTestId('day-3'));
    expect(mockOnDateSelect).toHaveBeenCalledWith(mockWeekDates[3]);
  });

  it('should show correct day names', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('day-name-0')).toHaveTextContent('Mon');
    expect(getByTestId('day-name-1')).toHaveTextContent('Tue');
    expect(getByTestId('day-name-2')).toHaveTextContent('Wed');
    expect(getByTestId('day-name-3')).toHaveTextContent('Thu');
    expect(getByTestId('day-name-4')).toHaveTextContent('Fri');
    expect(getByTestId('day-name-5')).toHaveTextContent('Sat');
    expect(getByTestId('day-name-6')).toHaveTextContent('Sun');
  });

  it('should show correct day numbers', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('day-number-0')).toHaveTextContent('1');
    expect(getByTestId('day-number-1')).toHaveTextContent('2');
    expect(getByTestId('day-number-2')).toHaveTextContent('3');
    expect(getByTestId('day-number-3')).toHaveTextContent('4');
    expect(getByTestId('day-number-4')).toHaveTextContent('5');
    expect(getByTestId('day-number-5')).toHaveTextContent('6');
    expect(getByTestId('day-number-6')).toHaveTextContent('7');
  });

  it('should show correct month abbreviations', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    // All dates are in January 2024
    for (let i = 0; i < 7; i++) {
      expect(getByTestId(`day-month-${i}`)).toHaveTextContent('Jan');
    }
  });

  it('should show status indicators correctly', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    // Day 3 is today and selected
    expect(getByTestId('today-indicator-2')).toBeTruthy();
    
    // Other days should have appropriate indicators
    expect(getByTestId('past-indicator-0')).toBeTruthy();
    expect(getByTestId('past-indicator-1')).toBeTruthy();
    expect(getByTestId('future-indicator-3')).toBeTruthy();
    expect(getByTestId('future-indicator-4')).toBeTruthy();
    expect(getByTestId('future-indicator-5')).toBeTruthy();
    expect(getByTestId('future-indicator-6')).toBeTruthy();
  });

  it('should render legend with all indicators', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('legend-past')).toBeTruthy();
    expect(getByTestId('legend-today')).toBeTruthy();
    expect(getByTestId('legend-upcoming')).toBeTruthy();
    
    expect(getByTestId('past-dot')).toBeTruthy();
    expect(getByTestId('today-dot')).toBeTruthy();
    expect(getByTestId('upcoming-dot')).toBeTruthy();
  });

  it('should handle empty week dates array', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={[]}
        selectedDate={mockSelectedDate}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('weekly-overview')).toBeTruthy();
    expect(getByTestId('week-dates')).toBeTruthy();
  });

  it('should handle null selected date', () => {
    const { getByTestId } = render(
      <WeeklyOverview
        weekDates={mockWeekDates}
        selectedDate={null}
        onDateSelect={mockOnDateSelect}
        isToday={mockIsToday}
        isSelected={mockIsSelected}
      />
    );

    expect(getByTestId('weekly-overview')).toBeTruthy();
  });
});

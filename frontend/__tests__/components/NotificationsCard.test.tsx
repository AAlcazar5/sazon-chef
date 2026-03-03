import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NotificationsCard from '../../components/profile/NotificationsCard';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('NotificationsCard', () => {
  const baseNotifications = {
    mealReminders: true,
    mealReminderTimes: ['08:00', '12:00'],
    newRecipes: true,
    goalUpdates: false,
    goalUpdateDay: 'Monday',
    goalUpdateTime: '09:00',
    shoppingReminders: true,
    weeklyInsights: true,
    quietHoursStart: null as string | null,
    quietHoursEnd: null as string | null,
    weekendsOff: false,
  };

  const defaultProps = {
    notifications: baseNotifications,
    updatingNotification: null as any,
    onToggleNotification: jest.fn(),
    onSaveMealReminderTime: jest.fn(),
    onRemoveMealReminderTime: jest.fn(),
  };

  it('renders all notification toggle sections', () => {
    render(<NotificationsCard {...defaultProps} />);

    expect(screen.getByText('Meal Reminders')).toBeTruthy();
    expect(screen.getByText('New Recipes')).toBeTruthy();
    expect(screen.getByText('Goal Updates')).toBeTruthy();
    expect(screen.getByText('Shopping Reminders')).toBeTruthy();
    expect(screen.getByText('Weekly Insights')).toBeTruthy();
    expect(screen.getByText('Quiet Hours')).toBeTruthy();
    expect(screen.getByText('Weekends Off')).toBeTruthy();
  });

  it('displays quiet hours time range when enabled', () => {
    const notifications = {
      ...baseNotifications,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };

    render(<NotificationsCard {...defaultProps} notifications={notifications} />);

    expect(screen.getByText('10:00 PM — 8:00 AM')).toBeTruthy();
  });

  it('does not show quiet hours time when disabled', () => {
    render(<NotificationsCard {...defaultProps} />);

    expect(screen.queryByText(/PM — /)).toBeNull();
  });

  it('renders descriptions for new toggles', () => {
    render(<NotificationsCard {...defaultProps} />);

    expect(screen.getByText('When your list is ready')).toBeTruthy();
    expect(screen.getByText('Your week at a glance')).toBeTruthy();
    expect(screen.getByText('No notifications during set hours')).toBeTruthy();
    expect(screen.getByText('No notifications on weekends')).toBeTruthy();
  });
});

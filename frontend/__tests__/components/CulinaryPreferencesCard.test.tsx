import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CulinaryPreferencesCard from '../../components/profile/CulinaryPreferencesCard';

// Mock dependencies
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
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

describe('CulinaryPreferencesCard', () => {
  const basePrefs = {
    bannedIngredients: [{ name: 'peanuts' }],
    likedCuisines: [{ name: 'Italian' }],
    dietaryRestrictions: [],
    preferredSuperfoods: [],
    cookTimePreference: 30,
    spiceLevel: 'medium',
  };

  it('renders dietary restrictions with severity badges', () => {
    const prefs = {
      ...basePrefs,
      dietaryRestrictions: [
        { name: 'gluten-free', severity: 'strict' },
        { name: 'dairy-free', severity: 'prefer_avoid' },
      ],
    };

    render(
      <CulinaryPreferencesCard
        profile={{ id: '1', name: 'Test', email: 'test@test.com', macroGoals: {} as any, preferences: prefs as any, createdAt: '', updatedAt: '' }}
        preferences={null}
      />
    );

    expect(screen.getByText('Gluten-Free')).toBeTruthy();
    expect(screen.getByText('🚫')).toBeTruthy(); // strict badge
    expect(screen.getByText('Dairy-Free')).toBeTruthy();
    expect(screen.getByText('⚠️')).toBeTruthy(); // prefer_avoid badge
  });

  it('renders cooking skill level', () => {
    const prefs = {
      ...basePrefs,
      cookingSkillLevel: 'home_cook',
    };

    render(
      <CulinaryPreferencesCard
        profile={{ id: '1', name: 'Test', email: 'test@test.com', macroGoals: {} as any, preferences: prefs as any, createdAt: '', updatedAt: '' }}
        preferences={null}
      />
    );

    expect(screen.getByText('Home Cook')).toBeTruthy();
    expect(screen.getByText('Cooking Skill')).toBeTruthy();
  });

  it('shows "Not set" when cooking skill is undefined', () => {
    render(
      <CulinaryPreferencesCard
        profile={{ id: '1', name: 'Test', email: 'test@test.com', macroGoals: {} as any, preferences: basePrefs as any, createdAt: '', updatedAt: '' }}
        preferences={null}
      />
    );

    // Cooking Skill row should show "Not set"
    const notSetTexts = screen.getAllByText('Not set');
    expect(notSetTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders weekday/weekend cook time when set', () => {
    const prefs = {
      ...basePrefs,
      weekdayCookTime: 20,
      weekendCookTime: 60,
    };

    render(
      <CulinaryPreferencesCard
        profile={{ id: '1', name: 'Test', email: 'test@test.com', macroGoals: {} as any, preferences: prefs as any, createdAt: '', updatedAt: '' }}
        preferences={null}
      />
    );

    expect(screen.getByText('Cook Time Budget')).toBeTruthy();
  });

  it('renders empty state when no preferences', () => {
    render(
      <CulinaryPreferencesCard profile={null} preferences={null} />
    );

    expect(screen.getByText('Set up your culinary preferences')).toBeTruthy();
  });

  it('defaults string-only dietary restrictions to strict badge', () => {
    const prefs = {
      ...basePrefs,
      dietaryRestrictions: ['vegan'],
    };

    render(
      <CulinaryPreferencesCard
        profile={{ id: '1', name: 'Test', email: 'test@test.com', macroGoals: {} as any, preferences: prefs as any, createdAt: '', updatedAt: '' }}
        preferences={null}
      />
    );

    expect(screen.getByText('Vegan')).toBeTruthy();
    expect(screen.getByText('🚫')).toBeTruthy(); // strict badge
  });
});

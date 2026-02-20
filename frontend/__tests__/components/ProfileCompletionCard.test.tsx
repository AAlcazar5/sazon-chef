// frontend/__tests__/components/ProfileCompletionCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', colors: {} }),
}));

// Mock Icon component
jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ProfileCompletionCard', () => {
  describe('Milestone Display', () => {
    it('should show "Getting Started" milestone at 33%', () => {
      const { getByText, getAllByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: true,
            macroGoals: false,
            preferences: false,
            percentage: 33,
          }}
        />
      );

      expect(getByText('Getting Started')).toBeTruthy();
      // "33%" appears in both main display and milestone dot
      expect(getAllByText('33%').length).toBeGreaterThanOrEqual(1);
      expect(getByText('1/3 sections complete')).toBeTruthy();
    });

    it('should show "Making Progress" milestone at 66%', () => {
      const { getByText, getAllByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: true,
            macroGoals: true,
            preferences: false,
            percentage: 66,
          }}
        />
      );

      expect(getByText('Making Progress')).toBeTruthy();
      // "66%" appears in both main display and milestone dot
      expect(getAllByText('66%').length).toBeGreaterThanOrEqual(1);
      expect(getByText('2/3 sections complete')).toBeTruthy();
    });

    it('should show completion trophy at 100%', () => {
      const { getByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: true,
            macroGoals: true,
            preferences: true,
            percentage: 100,
          }}
        />
      );

      expect(getByText('Profile Complete!')).toBeTruthy();
      expect(getByText("You've unlocked all personalized features. Sazon knows you well!")).toBeTruthy();
    });
  });

  describe('Checklist Items', () => {
    it('should show all three checklist items', () => {
      const { getByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: false,
            macroGoals: false,
            preferences: false,
            percentage: 0,
          }}
        />
      );

      expect(getByText('Physical Profile')).toBeTruthy();
      expect(getByText('Macro Goals')).toBeTruthy();
      expect(getByText('Culinary Preferences')).toBeTruthy();
    });

    it('should show reward descriptions', () => {
      const { getByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: false,
            macroGoals: false,
            preferences: false,
            percentage: 0,
          }}
        />
      );

      expect(getByText('Unlocks personalized recommendations')).toBeTruthy();
      expect(getByText('Enables macro-matched recipes')).toBeTruthy();
      expect(getByText('Tailors cuisine & dietary filters')).toBeTruthy();
    });
  });

  describe('Next Milestone', () => {
    it('should show next milestone when profile is incomplete', () => {
      const { getAllByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: false,
            macroGoals: false,
            preferences: false,
            percentage: 0,
          }}
        />
      );

      // "Getting Started" appears as next milestone label
      const texts = getAllByText(/Getting Started/);
      expect(texts.length).toBeGreaterThan(0);
    });

    it('should show "Making Progress" as next milestone after 33%', () => {
      const { getAllByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: true,
            macroGoals: false,
            preferences: false,
            percentage: 33,
          }}
        />
      );

      // "Making Progress" should appear as next milestone
      const texts = getAllByText(/Making Progress/);
      expect(texts.length).toBeGreaterThan(0);
    });
  });

  describe('Zero Completion', () => {
    it('should show "Profile Setup" with no milestone achieved', () => {
      const { getByText } = render(
        <ProfileCompletionCard
          profileCompletion={{
            physicalProfile: false,
            macroGoals: false,
            preferences: false,
            percentage: 0,
          }}
        />
      );

      expect(getByText('Profile Setup')).toBeTruthy();
      expect(getByText('0%')).toBeTruthy();
      expect(getByText('0/3 sections complete')).toBeTruthy();
    });
  });
});

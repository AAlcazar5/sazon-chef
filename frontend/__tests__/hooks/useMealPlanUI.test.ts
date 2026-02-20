// frontend/__tests__/hooks/useMealPlanUI.test.ts

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../constants/Colors', () => ({
  Colors: {
    secondaryRed: '#EF4444',
    primary: '#FF6B35',
    tertiaryGreen: '#10B981',
  },
  DarkColors: {
    secondaryRed: '#EF4444',
    primary: '#FF6B35',
    tertiaryGreen: '#10B981',
  },
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn(), success: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useMealPlanUI } from '../../hooks/useMealPlanUI';
import { Colors } from '../../constants/Colors';

const makeProps = (overrides: Partial<{ selectedDate: Date; setSelectedDate: jest.Mock }> = {}) => ({
  selectedDate: new Date('2025-01-15T12:00:00Z'),
  setSelectedDate: jest.fn(),
  ...overrides,
});

describe('useMealPlanUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── formatDate ─────────────────────────────────────────────────────

  describe('formatDate', () => {
    it('should return a localized date string with weekday, month, and day', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const formatted = result.current.formatDate(new Date('2025-01-15T12:00:00Z'));
      // Should contain the date components (exact format is locale-dependent)
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      // Should include month and day info
      expect(formatted).toMatch(/\d/); // contains a number (the day)
    });

    it('should format different dates differently', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const jan1 = result.current.formatDate(new Date('2025-01-01'));
      const jan15 = result.current.formatDate(new Date('2025-01-15'));
      expect(jan1).not.toBe(jan15);
    });
  });

  // ── formatDateRange ────────────────────────────────────────────────

  describe('formatDateRange', () => {
    it('should format same-month range with single month name', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-07');
      const range = result.current.formatDateRange(start, end);
      // Same month: should contain "Jan" once and two numbers separated by " - "
      expect(range).toContain('Jan');
      expect(range).toContain(' - ');
      // Should NOT contain the month name twice (same-month range)
      const janCount = (range.match(/Jan/g) || []).length;
      expect(janCount).toBe(1);
    });

    it('should format cross-month range with two month names', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const start = new Date('2025-01-28');
      const end = new Date('2025-02-03');
      const range = result.current.formatDateRange(start, end);
      // Should contain two different months
      expect(range).toContain('Jan');
      expect(range).toContain('Feb');
    });
  });

  // ── isToday ────────────────────────────────────────────────────────

  describe('isToday', () => {
    it('should return true for today', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(result.current.isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.current.isToday(tomorrow)).toBe(false);
    });
  });

  // ── isSelected ─────────────────────────────────────────────────────

  describe('isSelected', () => {
    it('should return true for the selected date', () => {
      const selectedDate = new Date('2025-01-15');
      const { result } = renderHook(() => useMealPlanUI(makeProps({ selectedDate })));
      expect(result.current.isSelected(new Date('2025-01-15'))).toBe(true);
    });

    it('should return false for a different date', () => {
      const selectedDate = new Date('2025-01-15');
      const { result } = renderHook(() => useMealPlanUI(makeProps({ selectedDate })));
      expect(result.current.isSelected(new Date('2025-01-16'))).toBe(false);
    });
  });

  // ── groupMealsByType ───────────────────────────────────────────────

  describe('groupMealsByType', () => {
    it('should group hour 7 meals as breakfast (5-10)', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 7: [{ id: '1', name: 'Oatmeal' }] });
      expect(meals.breakfast).toHaveLength(1);
      expect(meals.lunch).toHaveLength(0);
    });

    it('should group hour 12 meals as lunch (11-14)', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 12: [{ id: '2', name: 'Salad' }] });
      expect(meals.lunch).toHaveLength(1);
      expect(meals.breakfast).toHaveLength(0);
    });

    it('should group hour 18 meals as dinner (15-20)', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 18: [{ id: '3', name: 'Pasta' }] });
      expect(meals.dinner).toHaveLength(1);
    });

    it('should group hour 22 meals as snacks (>=21)', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 22: [{ id: '4', name: 'Chips' }] });
      expect(meals.snacks).toHaveLength(1);
    });

    it('should group hour 2 meals as snacks (<5)', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 2: [{ id: '5', name: 'Midnight snack' }] });
      expect(meals.snacks).toHaveLength(1);
    });

    it('should handle multiple meals per hour', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({
        7: [{ id: '1' }, { id: '2' }],
        12: [{ id: '3' }],
      });
      expect(meals.breakfast).toHaveLength(2);
      expect(meals.lunch).toHaveLength(1);
    });

    it('should return empty groups for empty input', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({});
      expect(meals.breakfast).toHaveLength(0);
      expect(meals.lunch).toHaveLength(0);
      expect(meals.dinner).toHaveLength(0);
      expect(meals.snacks).toHaveLength(0);
    });

    it('should add the hour field to each meal', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const meals = result.current.groupMealsByType({ 8: [{ id: '1' }] });
      expect(meals.breakfast[0].hour).toBe(8);
    });
  });

  // ── formatTime ─────────────────────────────────────────────────────

  describe('formatTime', () => {
    it('should format noon as 12:00 PM', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.formatTime(12, 0)).toBe('12:00 PM');
    });

    it('should format midnight as 12:00 AM', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.formatTime(0, 0)).toBe('12:00 AM');
    });

    it('should format 1:30 PM correctly', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.formatTime(13, 30)).toBe('1:30 PM');
    });

    it('should zero-pad single-digit minutes', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.formatTime(9, 5)).toBe('9:05 AM');
    });

    it('should format 11:59 PM correctly', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.formatTime(23, 59)).toBe('11:59 PM');
    });
  });

  // ── getMacroProgress ───────────────────────────────────────────────

  describe('getMacroProgress', () => {
    it('should return 50 for half consumption', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.getMacroProgress(50, 100)).toBe(50);
    });

    it('should return 100 for exactly at target', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.getMacroProgress(100, 100)).toBe(100);
    });

    it('should cap at 100 when over target', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.getMacroProgress(150, 100)).toBe(100);
    });

    it('should return 0 for no consumption', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.getMacroProgress(0, 100)).toBe(0);
    });
  });

  // ── getMacroColor ──────────────────────────────────────────────────

  describe('getMacroColor', () => {
    it('should return red color at or over 100%', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const color = result.current.getMacroColor(100, 100);
      expect(color.color).toBe(Colors.secondaryRed);
    });

    it('should return primary color at 80%', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const color = result.current.getMacroColor(80, 100);
      expect(color.color).toBe(Colors.primary);
    });

    it('should return green color below 80%', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const color = result.current.getMacroColor(50, 100);
      expect(color.color).toBe(Colors.tertiaryGreen);
    });

    it('should return green color at 0%', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const color = result.current.getMacroColor(0, 100);
      expect(color.color).toBe(Colors.tertiaryGreen);
    });
  });

  // ── handleJumpToToday ──────────────────────────────────────────────

  describe('handleJumpToToday', () => {
    it('should call setSelectedDate with today', () => {
      const setSelectedDate = jest.fn();
      const { result } = renderHook(() => useMealPlanUI(makeProps({ setSelectedDate })));

      act(() => {
        result.current.handleJumpToToday();
      });

      expect(setSelectedDate).toHaveBeenCalledTimes(1);
      const calledWith = setSelectedDate.mock.calls[0][0];
      expect(calledWith.toDateString()).toBe(new Date().toDateString());
    });
  });

  // ── hours and mealTypeToHour ───────────────────────────────────────

  describe('hours and mealTypeToHour', () => {
    it('should return 24 hours', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.hours).toHaveLength(24);
    });

    it('should mark meal times correctly', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      const mealHours = result.current.hours.filter(h => h.isMealTime);
      expect(mealHours.map(h => h.hour)).toEqual([7, 12, 18]);
    });

    it('should have correct mealTypeToHour mapping', () => {
      const { result } = renderHook(() => useMealPlanUI(makeProps()));
      expect(result.current.mealTypeToHour.breakfast).toBe(7);
      expect(result.current.mealTypeToHour.lunch).toBe(12);
      expect(result.current.mealTypeToHour.dinner).toBe(18);
      expect(result.current.mealTypeToHour.snack).toBe(15);
    });
  });
});

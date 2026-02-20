// frontend/hooks/useMealPlanUI.ts
// Custom hook for meal plan UI state and utility functions

import { useState, useRef, useEffect, useLayoutEffect, Dispatch, SetStateAction } from 'react';
import { ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../constants/Colors';
import { HapticPatterns } from '../constants/Haptics';

// ─── Types ──────────────────────────────────────────────────────────────

export interface HourData {
  hour: number;
  timeString: string;
  displayTime: string;
  isMealTime: boolean;
  label: string | null;
}

export interface DragState {
  hour: number;
  mealIndex: number;
  meal: any;
}

export type ViewMode = '24hour' | 'compact' | 'collapsible';
export type MealTypeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface GroupedMeals {
  breakfast: any[];
  lunch: any[];
  dinner: any[];
  snacks: any[];
  other: any[];
}

interface UseMealPlanUIProps {
  /** Selected date for meal plan */
  selectedDate: Date;
  /** Setter for selected date */
  setSelectedDate: Dispatch<SetStateAction<Date>>;
}

interface UseMealPlanUIReturn {
  /** Whether dark mode is active */
  isDark: boolean;

  /** Time picker modal visibility */
  showTimePickerModal: boolean;
  /** Set time picker modal visibility */
  setShowTimePickerModal: Dispatch<SetStateAction<boolean>>;
  /** Selected hour for time picker */
  selectedHour: number;
  /** Set selected hour */
  setSelectedHour: Dispatch<SetStateAction<number>>;
  /** Selected minute for time picker */
  selectedMinute: number;
  /** Set selected minute */
  setSelectedMinute: Dispatch<SetStateAction<number>>;
  /** Manual time input string */
  manualTimeInput: string;
  /** Whether manual input mode is active */
  showManualInput: boolean;
  /** Handle manual time input changes */
  handleManualTimeInput: (input: string) => void;
  /** Toggle between manual input and picker */
  toggleManualInput: () => void;

  /** Current drag state */
  draggingMeal: DragState | null;
  /** Set drag state */
  setDraggingMeal: Dispatch<SetStateAction<DragState | null>>;
  /** Hour being dragged over */
  dragOverHour: number | null;
  /** Set drag over hour */
  setDragOverHour: Dispatch<SetStateAction<number | null>>;

  /** Current view mode */
  viewMode: ViewMode;
  /** Set view mode */
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  /** Current meal type filter */
  mealTypeFilter: MealTypeFilter;
  /** Set meal type filter */
  setMealTypeFilter: Dispatch<SetStateAction<MealTypeFilter>>;
  /** View mode picker visibility */
  showViewModePicker: boolean;
  /** Set view mode picker visibility */
  setShowViewModePicker: Dispatch<SetStateAction<boolean>>;
  /** Set of expanded day date strings */
  expandedDays: Set<string>;
  /** Set expanded days */
  setExpandedDays: Dispatch<SetStateAction<Set<string>>>;
  /** Whether macros section is expanded */
  macrosExpanded: boolean;
  /** Set macros expanded state */
  setMacrosExpanded: Dispatch<SetStateAction<boolean>>;

  /** ScrollView ref */
  scrollViewRef: React.RefObject<ScrollView | null>;
  /** Scroll position ref */
  scrollPositionRef: React.MutableRefObject<number>;

  /** Show add recipe modal */
  showAddRecipeModal: boolean;
  /** Set show add recipe modal */
  setShowAddRecipeModal: Dispatch<SetStateAction<boolean>>;

  /** 24-hour data array */
  hours: HourData[];
  /** Meal type to hour mapping */
  mealTypeToHour: Record<string, number>;

  /** Format a date to short string */
  formatDate: (date: Date) => string;
  /** Format a date range string */
  formatDateRange: (startDate: Date, endDate: Date) => string;
  /** Check if date is today */
  isToday: (date: Date) => boolean;
  /** Check if date is the selected date */
  isSelected: (date: Date) => boolean;
  /** Jump to today */
  handleJumpToToday: () => void;
  /** Group meals by type based on hour */
  groupMealsByType: (hourlyMeals: Record<number, any[]>) => GroupedMeals;
  /** Format time from hour and minute */
  formatTime: (hour: number, minute: number) => string;
  /** Get macro progress percentage (0-100) */
  getMacroProgress: (current: number, target: number) => number;
  /** Get macro color based on progress */
  getMacroColor: (current: number, target: number) => { color: string };
}

// ─── Helper: Generate 24 hours array ────────────────────────────────────

function generateHours(): HourData[] {
  const hours: HourData[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = i;
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayTime = `${displayHour}:00 ${period}`;

    hours.push({
      hour,
      timeString,
      displayTime,
      isMealTime: [7, 12, 18].includes(hour),
      label: hour === 7 ? 'Breakfast' : hour === 12 ? 'Lunch' : hour === 18 ? 'Dinner' : null,
    });
  }
  return hours;
}

const HOURS = generateHours();

const MEAL_TYPE_TO_HOUR: Record<string, number> = {
  breakfast: 7,
  lunch: 12,
  dinner: 18,
  snack: 15,
};

// ─── Hook ───────────────────────────────────────────────────────────────

export function useMealPlanUI({
  selectedDate,
  setSelectedDate,
}: UseMealPlanUIProps): UseMealPlanUIReturn {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Time picker state
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Add recipe modal
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);

  // Drag and drop state
  const [draggingMeal, setDraggingMeal] = useState<DragState | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('24hour');
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>('all');
  const [showViewModePicker, setShowViewModePicker] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Macros section collapse state
  const [macrosExpanded, setMacrosExpanded] = useState(true);

  // ScrollView ref and scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);

  // ── Manual time input sync ──
  useEffect(() => {
    if (showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  }, [selectedHour, selectedMinute, showManualInput]);

  // ── Restore scroll position after expandedDays changes ──
  useLayoutEffect(() => {
    if (viewMode === 'collapsible' && scrollViewRef.current) {
      const savedScrollY = scrollPositionRef.current;
      scrollViewRef.current.scrollTo({
        y: savedScrollY,
        animated: false,
      });
    }
  }, [expandedDays, viewMode]);

  // ── Utility functions ──

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleJumpToToday = (): void => {
    const today = new Date();
    setSelectedDate(today);
    HapticPatterns.buttonPress();
  };

  const groupMealsByType = (hourlyMeals: Record<number, any[]>): GroupedMeals => {
    const grouped: GroupedMeals = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      other: [],
    };

    Object.entries(hourlyMeals).forEach(([hourStr, meals]) => {
      const hour = parseInt(hourStr);
      meals.forEach((meal) => {
        if (hour >= 5 && hour < 11) {
          grouped.breakfast.push({ ...meal, hour });
        } else if (hour >= 11 && hour < 15) {
          grouped.lunch.push({ ...meal, hour });
        } else if (hour >= 15 && hour < 21) {
          grouped.dinner.push({ ...meal, hour });
        } else if (hour >= 21 || hour < 5) {
          grouped.snacks.push({ ...meal, hour });
        } else {
          grouped.other.push({ ...meal, hour });
        }
      });
    });

    return grouped;
  };

  const formatTime = (hour: number, minute: number): string => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const getMacroProgress = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const getMacroColor = (current: number, target: number): { color: string } => {
    const progress = getMacroProgress(current, target);
    if (progress >= 100) return { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed };
    if (progress >= 80) return { color: isDark ? DarkColors.primary : Colors.primary };
    return { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen };
  };

  const handleManualTimeInput = (input: string): void => {
    setManualTimeInput(input);

    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = input.match(timeRegex);

    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        setSelectedHour(hour);
        setSelectedMinute(minute);
      }
    }
  };

  const toggleManualInput = (): void => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  };

  return {
    isDark,

    showTimePickerModal,
    setShowTimePickerModal,
    selectedHour,
    setSelectedHour,
    selectedMinute,
    setSelectedMinute,
    manualTimeInput,
    showManualInput,
    handleManualTimeInput,
    toggleManualInput,

    draggingMeal,
    setDraggingMeal,
    dragOverHour,
    setDragOverHour,

    viewMode,
    setViewMode,
    mealTypeFilter,
    setMealTypeFilter,
    showViewModePicker,
    setShowViewModePicker,
    expandedDays,
    setExpandedDays,
    macrosExpanded,
    setMacrosExpanded,

    scrollViewRef,
    scrollPositionRef,

    showAddRecipeModal,
    setShowAddRecipeModal,

    hours: HOURS,
    mealTypeToHour: MEAL_TYPE_TO_HOUR,

    formatDate,
    formatDateRange,
    isToday,
    isSelected,
    handleJumpToToday,
    groupMealsByType,
    formatTime,
    getMacroProgress,
    getMacroColor,
  };
}

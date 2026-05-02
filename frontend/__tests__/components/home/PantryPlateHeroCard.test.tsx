// frontend/__tests__/components/home/PantryPlateHeroCard.test.tsx
// Group 10X Phase 2 — "Tonight's plate is in your pantry" home hero card tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, testID }: any) => (
      <View testID={testID ?? 'linear-gradient'}>{children}</View>
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: any) {
      return <Text testID={testID ?? `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID ?? `brand-btn-${label}`}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={testID}>
        {children}
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import PantryPlateHeroCard from '../../../components/home/PantryPlateHeroCard';
import type { PermutationCandidate } from '../../../lib/api';

const SALMON: any = {
  id: 'salmon-c',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  cuisineTags: ['Mediterranean'],
  dietaryTags: ['high_protein'],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon', 'olive oil'],
  pantryCoveragePercent: 100,
};

const FARRO: any = {
  id: 'farro-c',
  slot: 'base',
  name: 'Farro',
  defaultPortionGrams: 100,
  caloriesPerPortion: 200,
  proteinG: 7,
  carbsG: 35,
  fatG: 1,
  fiberG: 5,
  cuisineTags: [],
  dietaryTags: ['vegan'],
  cookMethodHint: 'simmer',
  pantryIngredientNames: ['farro'],
  pantryCoveragePercent: 100,
};

const CARROTS: any = {
  id: 'carrots-c',
  slot: 'vegetable',
  name: 'Roasted Carrots',
  defaultPortionGrams: 120,
  caloriesPerPortion: 80,
  proteinG: 1,
  carbsG: 12,
  fatG: 3,
  fiberG: 4,
  cuisineTags: [],
  dietaryTags: ['vegan'],
  cookMethodHint: 'roast',
  pantryIngredientNames: ['carrots'],
  pantryCoveragePercent: 100,
};

const YOGURT: any = {
  id: 'yogurt-c',
  slot: 'sauce',
  name: 'Yogurt Sauce',
  defaultPortionGrams: 60,
  caloriesPerPortion: 70,
  proteinG: 4,
  carbsG: 5,
  fatG: 4,
  fiberG: 0,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'mix',
  pantryIngredientNames: ['yogurt'],
  pantryCoveragePercent: 100,
};

const MOCK_PLATE: PermutationCandidate = {
  id: 'plate-tonight-id',
  components: [
    { slot: 'protein', component: SALMON, portionMultiplier: 1 },
    { slot: 'base', component: FARRO, portionMultiplier: 1 },
    { slot: 'vegetable', component: CARROTS, portionMultiplier: 1 },
    { slot: 'sauce', component: YOGURT, portionMultiplier: 1 },
  ],
  coherenceScore: 0.9,
  pantryCoveragePercent: 100,
  macroFitScore: 0.85,
};

describe('PantryPlateHeroCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the TONIGHT eyebrow', () => {
    const { getByText } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    expect(getByText('TONIGHT')).toBeTruthy();
  });

  it('renders the card title', () => {
    const { getByTestId } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    expect(getByTestId('pantry-plate-title')).toBeTruthy();
  });

  it('renders subtitle with component count', () => {
    const { getByText } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    expect(getByText('4 components in your pantry — already a plate.')).toBeTruthy();
  });

  it('renders mini slot icons for each component', () => {
    const { getAllByTestId } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    expect(getAllByTestId(/pantry-plate-slot-icon-/).length).toBe(4);
  });

  it('renders macro line with computed totals', () => {
    const { getByTestId } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    const macroLine = getByTestId('pantry-plate-macros');
    expect(macroLine).toBeTruthy();
    // 280+200+80+70=630 cal, 30+7+1+4=42g pro, 0+35+12+5=52g carbs, 18+1+3+4=26g fat
    expect(macroLine.props.children).toContain('630');
    expect(macroLine.props.children).toContain('42');
  });

  it('has correct accessibilityLabel', () => {
    const { getByLabelText } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    expect(getByLabelText("Tonight's plate — 4 ingredients already in your pantry")).toBeTruthy();
  });

  it('tapping Cook this navigates to build-a-plate with correct params', async () => {
    const { getByText } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    await act(async () => {
      fireEvent.press(getByText('Cook this'));
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/build-a-plate',
      params: { pantryOnly: 'true', preset: 'plate-tonight-id' },
    });
  });

  it('tapping Cook this writes plate to AsyncStorage before navigating', async () => {
    const { getByText } = render(<PantryPlateHeroCard plate={MOCK_PLATE} />);
    await act(async () => {
      fireEvent.press(getByText('Cook this'));
    });
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'tonights_plate_preset:plate-tonight-id',
        JSON.stringify(MOCK_PLATE),
      );
    });
    expect(mockPush).toHaveBeenCalled();
  });
});

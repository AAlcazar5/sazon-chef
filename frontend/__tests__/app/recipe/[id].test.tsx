// frontend/__tests__/app/recipe/[id].test.tsx
// Group 10X Phase 1+2 — user-composed plate hybrid view (recipe + composer entry).

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

const mockGetRecipe = jest.fn();
const mockGetVariations = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getRecipe: (...args: any[]) => mockGetRecipe(...args),
  },
  composedPlateApi: {
    fetchVariations: (...args: any[]) => mockGetVariations(...args),
  },
}));

let mockSearchParams: any = { id: 'recipe-1' };
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  router: { push: mockPush, replace: mockReplace, back: mockBack },
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID={props.testID ?? 'expo-image'} />,
  };
});

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

jest.mock('../../../components/ui/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, visible, testID }: any) =>
      visible ? <View testID={testID ?? 'bottom-sheet'}>{children}</View> : null,
  };
});

jest.mock('../../../components/recipe/PlateVariationsSheet', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, plateId, onClose }: any) =>
      visible ? (
        <View testID="plate-variations-sheet">
          <Text testID="variations-plate-id">{plateId}</Text>
          <TouchableOpacity testID="close-variations-sheet" onPress={onClose}>
            <Text>close</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import RecipeIdScreen from '../../../app/recipe/[id]';

const COMPOSED_RECIPE = {
  id: 'composed-1',
  title: 'Salmon Bowl',
  imageUrl: 'https://example.com/salmon.jpg',
  source: 'user-composed',
  ingredients: ['salmon', 'farro', 'roasted carrots'],
  instructions: ['cook salmon', 'cook farro', 'plate'],
  cookTime: 25,
  calories: 540,
  protein: 38,
  carbs: 50,
  fat: 18,
  composedComponents: [
    { slot: 'protein', componentName: 'Salmon' },
    { slot: 'base', componentName: 'Farro' },
    { slot: 'vegetable', componentName: 'Roasted Carrots' },
    { slot: 'sauce', componentName: 'Yogurt Sauce' },
  ],
};

const REGULAR_RECIPE = {
  id: 'recipe-1',
  title: 'Classic Lasagna',
  imageUrl: 'https://example.com/lasagna.jpg',
  source: 'database',
  ingredients: ['noodles', 'sauce', 'cheese'],
  instructions: ['layer', 'bake'],
  cookTime: 60,
  calories: 700,
  protein: 35,
  carbs: 60,
  fat: 30,
};

describe('RecipeIdScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { id: 'recipe-1' };
  });

  describe('user-composed source', () => {
    beforeEach(() => {
      mockSearchParams = { id: 'composed-1' };
      mockGetRecipe.mockResolvedValue({ data: COMPOSED_RECIPE });
    });

    it('renders the recipe title', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      expect(await findByText('Salmon Bowl')).toBeTruthy();
    });

    it('shows BUILT FROM editorial header', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      expect(await findByText('BUILT FROM')).toBeTruthy();
    });

    it('renders slot component chips for each composed component', async () => {
      const { findByText, getByText } = render(<RecipeIdScreen />);
      await findByText('Salmon');
      expect(getByText('Farro')).toBeTruthy();
      expect(getByText('Roasted Carrots')).toBeTruthy();
      expect(getByText('Yogurt Sauce')).toBeTruthy();
    });

    it('shows the Edit composition button', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      expect(await findByText('Edit composition')).toBeTruthy();
    });

    it('Edit composition navigates to /build-a-plate with plateId', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      const btn = await findByText('Edit composition');
      await act(async () => {
        fireEvent.press(btn);
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/build-a-plate',
        params: { plateId: 'composed-1' },
      });
    });

    it('shows the Vary this plate button', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      expect(await findByText('Vary this plate')).toBeTruthy();
    });

    it('Vary this plate opens the variations sheet with correct plateId', async () => {
      const { findByText, findByTestId } = render(<RecipeIdScreen />);
      const btn = await findByText('Vary this plate');
      await act(async () => {
        fireEvent.press(btn);
      });
      const sheet = await findByTestId('plate-variations-sheet');
      expect(sheet).toBeTruthy();
      const idText = await findByTestId('variations-plate-id');
      expect(idText.props.children).toBe('composed-1');
    });
  });

  describe('non-composed source', () => {
    beforeEach(() => {
      mockSearchParams = { id: 'recipe-1' };
      mockGetRecipe.mockResolvedValue({ data: REGULAR_RECIPE });
    });

    it('renders the recipe title', async () => {
      const { findByText } = render(<RecipeIdScreen />);
      expect(await findByText('Classic Lasagna')).toBeTruthy();
    });

    it('does not show BUILT FROM header', async () => {
      const { findByText, queryByText } = render(<RecipeIdScreen />);
      await findByText('Classic Lasagna');
      expect(queryByText('BUILT FROM')).toBeNull();
    });

    it('does not show Edit composition button', async () => {
      const { findByText, queryByText } = render(<RecipeIdScreen />);
      await findByText('Classic Lasagna');
      expect(queryByText('Edit composition')).toBeNull();
    });

    it('does not show Vary this plate button', async () => {
      const { findByText, queryByText } = render(<RecipeIdScreen />);
      await findByText('Classic Lasagna');
      expect(queryByText('Vary this plate')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('renders a loading indicator while fetching', async () => {
      let resolve!: (v: any) => void;
      mockGetRecipe.mockReturnValue(new Promise((r) => { resolve = r; }));
      const { findByTestId } = render(<RecipeIdScreen />);
      expect(await findByTestId('recipe-id-loading')).toBeTruthy();
      await act(async () => { resolve({ data: REGULAR_RECIPE }); });
    });
  });
});

// frontend/__tests__/app/pantry.test.tsx
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../components/shopping/PantrySection', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ pantryItems, loading }: any) => (
      <View testID="pantry-section">
        <Text>{loading ? 'loading' : `count:${pantryItems.length}`}</Text>
      </View>
    ),
  };
});

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, []);
  },
}));

jest.mock('../../lib/api', () => ({
  pantryApi: {
    getAll: jest.fn(),
    addMany: jest.fn(),
    removeItem: jest.fn(),
    pantryMatch: jest.fn().mockResolvedValue({ data: { recipes: [] } }),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PantryScreen from '../../app/pantry';
import { pantryApi } from '../../lib/api';

const composablePantry = [
  { id: 'p1', name: 'chicken breast', category: 'Protein' },
  { id: 'p2', name: 'brown rice', category: 'Pantry' },
  { id: 'p3', name: 'arugula', category: 'Produce' },
  { id: 'p4', name: 'olive oil', category: 'Pantry' },
];

describe('PantryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pantryApi.getAll as jest.Mock).mockResolvedValue({
      data: [
        { id: 'p1', name: 'salt', category: 'Pantry' },
        { id: 'p2', name: 'onion', category: 'Produce' },
      ],
    });
  });

  test('loads pantry items on mount and renders count', async () => {
    const { getByText } = render(<PantryScreen />);
    await waitFor(() => expect(pantryApi.getAll).toHaveBeenCalled());
    await waitFor(() => expect(getByText('count:2')).toBeTruthy());
  });

  test('back button calls router.back()', async () => {
    const { getByLabelText } = render(<PantryScreen />);
    await waitFor(() => expect(pantryApi.getAll).toHaveBeenCalled());
    fireEvent.press(getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  test('handles empty pantry gracefully', async () => {
    (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    const { getByText } = render(<PantryScreen />);
    await waitFor(() => expect(getByText('count:0')).toBeTruthy());
  });

  test('handles API error gracefully (no crash, empty state)', async () => {
    (pantryApi.getAll as jest.Mock).mockRejectedValue(new Error('net'));
    const { getByText } = render(<PantryScreen />);
    await waitFor(() => expect(getByText('count:0')).toBeTruthy());
  });

  describe('BuildAPlateCTA (Group 10X Phase 1)', () => {
    test('renders CTA when pantry has >=4 items spanning multiple slots', async () => {
      (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: composablePantry });
      const { getByTestId } = render(<PantryScreen />);
      await waitFor(() => expect(getByTestId('build-a-plate-cta')).toBeTruthy());
    });

    test('does NOT render CTA when pantry has <4 items', async () => {
      (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: composablePantry.slice(0, 2) });
      const { queryByTestId, getByText } = render(<PantryScreen />);
      await waitFor(() => expect(getByText('count:2')).toBeTruthy());
      expect(queryByTestId('build-a-plate-cta')).toBeNull();
    });

    test('tapping CTA navigates to /build-a-plate?pantryOnly=true', async () => {
      (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: composablePantry });
      const { getByTestId } = render(<PantryScreen />);
      const cta = await waitFor(() => getByTestId('build-a-plate-cta'));
      fireEvent.press(cta);
      expect(mockPush).toHaveBeenCalledWith('/build-a-plate?pantryOnly=true');
    });
  });
});

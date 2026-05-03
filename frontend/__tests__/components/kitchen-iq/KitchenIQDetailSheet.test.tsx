// frontend/__tests__/components/kitchen-iq/KitchenIQDetailSheet.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    userId: 'user_test',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
  })),
  useFoodIntelUserState: jest.fn(() => ({
    userId: 'user_test',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
  })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import KitchenIQDetailSheet from '../../../components/kitchen-iq/KitchenIQDetailSheet';
import type { KitchenIQCard } from '../../../lib/kitchenIQ/cards';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const sampleCard: KitchenIQCard = {
  id: 'nut-magnesium',
  type: 'nutrient',
  title: 'Your Body on Magnesium',
  subtitle: 'The mineral 68% of people are low on',
  heroEmoji: '🧲',
  sections: [
    {
      heading: 'What it does',
      body: 'Magnesium powers 300+ enzyme reactions.',
    },
    {
      heading: 'How much you need',
      body: 'Adults need 310–420mg/day.',
      visual: 'scale',
    },
  ],
  topFoods: [
    { name: 'Pumpkin seeds', amount: '1 oz', dvPercent: 37 },
    { name: 'Spinach', amount: '½ cup', dvPercent: 19 },
  ],
  recipes: ['r1', 'r2'],
  tags: ['magnesium'],
  personalizationKeys: {
    cuisine: ['mexican'],
    nutrient: ['magnesium'],
    ingredient: ['pumpkin seeds'],
    skillTier: ['beginner', 'cook', 'chef'],
  },
  unlockCondition: { type: 'cook_count', threshold: 5 },
};

const sampleRecipes = [
  { id: 'r1', title: 'Pumpkin Seed Salad', cuisine: 'mexican', isInCookbook: true },
  { id: 'r2', title: 'Magnesium Power Bowl', cuisine: 'mediterranean', isInCookbook: false },
];

describe('KitchenIQDetailSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  it('renders nothing when card is null', () => {
    const { toJSON } = render(
      <KitchenIQDetailSheet card={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders hero (emoji + title + subtitle) when card is set', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    expect(screen.getByText('🧲')).toBeTruthy();
    expect(screen.getByText('Your Body on Magnesium')).toBeTruthy();
    expect(screen.getByText('The mineral 68% of people are low on')).toBeTruthy();
  });

  it('renders all sections with their headings and bodies', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    expect(screen.getByText('What it does')).toBeTruthy();
    expect(screen.getByText('Magnesium powers 300+ enzyme reactions.')).toBeTruthy();
    expect(screen.getByText('How much you need')).toBeTruthy();
    expect(screen.getByText('Adults need 310–420mg/day.')).toBeTruthy();
  });

  it('renders section visual icon next to heading when visual is set', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    // 'scale' visual maps to 📏
    expect(screen.getByText('📏')).toBeTruthy();
  });

  it('renders top foods with name, amount, and a proportional dvPercent bar', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    expect(screen.getByText('Pumpkin seeds')).toBeTruthy();
    expect(screen.getByText('1 oz')).toBeTruthy();
    expect(screen.getByText('Spinach')).toBeTruthy();
    expect(screen.getByText('½ cup')).toBeTruthy();

    const bar37 = screen.getByTestId('top-food-bar-0');
    const bar19 = screen.getByTestId('top-food-bar-1');
    const flatten = (s: any): any => Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s ?? {});
    const w37 = flatten(bar37.props.style).width;
    const w19 = flatten(bar19.props.style).width;
    expect(w37).toBe('37%');
    expect(w19).toBe('19%');
  });

  it('caps dvPercent bar width at 100%', () => {
    const bigCard: KitchenIQCard = {
      ...sampleCard,
      topFoods: [{ name: 'Oysters', amount: '3 oz', dvPercent: 673 }],
    };
    render(<KitchenIQDetailSheet card={bigCard} onClose={jest.fn()} />);
    const bar = screen.getByTestId('top-food-bar-0');
    const flatten = (s: any): any => Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s ?? {});
    expect(flatten(bar.props.style).width).toBe('100%');
  });

  it('renders recipes carousel when recipes prop has entries', () => {
    render(
      <KitchenIQDetailSheet
        card={sampleCard}
        recipes={sampleRecipes}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Pumpkin Seed Salad')).toBeTruthy();
    expect(screen.getByText('Magnesium Power Bowl')).toBeTruthy();
  });

  it('hides recipes carousel when recipes prop is empty or absent', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    expect(screen.queryByTestId('kitchen-iq-recipes-carousel')).toBeNull();
  });

  it('calls onRecipeTap with id when a recipe is tapped', () => {
    const onRecipeTap = jest.fn();
    render(
      <KitchenIQDetailSheet
        card={sampleCard}
        recipes={sampleRecipes}
        onRecipeTap={onRecipeTap}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Pumpkin Seed Salad'));
    expect(onRecipeTap).toHaveBeenCalledWith('r1');
  });

  it('writes engagement signal to AsyncStorage when a recipe is tapped', async () => {
    render(
      <KitchenIQDetailSheet
        card={sampleCard}
        recipes={sampleRecipes}
        onRecipeTap={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Pumpkin Seed Salad'));
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
    const [key, value] = mockAsyncStorage.setItem.mock.calls[0];
    expect(key).toBe('kitchen_iq_recipe_interest::user_test');
    const parsed = JSON.parse(value as string);
    expect(parsed[0]).toMatchObject({ cardId: 'nut-magnesium', recipeId: 'r1' });
    expect(typeof parsed[0].timestamp).toBe('number');
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<KitchenIQDetailSheet card={sampleCard} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    render(<KitchenIQDetailSheet card={sampleCard} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('kitchen-iq-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('exposes accessibilityLabel on the sheet root', () => {
    render(<KitchenIQDetailSheet card={sampleCard} onClose={jest.fn()} />);
    expect(screen.getByLabelText(/Your Body on Magnesium details/i)).toBeTruthy();
  });
});

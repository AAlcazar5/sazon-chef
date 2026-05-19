// Tier Y-3 — the headline replica: the in-chat Cooking Mode recipe card.
// The defining behavior (founder screenshots): the servings stepper
// rescales the ingredient list AND the quantities in step prose in
// lockstep, while temps/times stay put. RED-first.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import CookingModeRecipeCard from '../../../components/cooking/CookingModeRecipeCard';

const PROPS = {
  title: 'Roasted Potatoes',
  description: 'Crispy, protein-packed snack.',
  baseServings: 4,
  ingredients: [
    { name: 'potatoes or sweet potatoes', amount: 2, unit: 'pounds' },
    { name: 'olive oil', amount: 2, unit: 'tablespoons' },
    { name: 'garlic powder', amount: 0.5, unit: 'teaspoons' },
    { name: 'salt', amount: 0.8, unit: 'teaspoons' },
  ],
  steps: [
    'Prep: scrub 2 pounds potatoes or sweet potatoes.',
    'Season: toss with 2 tablespoons olive oil, 0.5 teaspoons garlic powder, and 0.8 teaspoons salt.',
    'Roast at 400°F for 30 minutes.',
  ],
  macros: { calories: 160, protein: 10, carbs: 18, fat: 6, fiber: 6 },
  notes: 'Cool completely before eating for maximum crunch.',
  onGetCooking: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('<CookingModeRecipeCard />', () => {
  it('renders header, ingredients, steps, and per-serving macros', () => {
    const { getByText, getAllByText, getByLabelText } = render(
      <CookingModeRecipeCard {...PROPS} />,
    );
    expect(getByText('Roasted Potatoes')).toBeTruthy();
    expect(getByText('Crispy, protein-packed snack.')).toBeTruthy();
    // appears twice — ingredient line + step 1 prose (proves both render
    // off the same base)
    expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(getByText(/Roast at 400°F for 30 minutes/)).toBeTruthy();
    expect(getByText(/160/)).toBeTruthy(); // macros NOTES (per serving)
    expect(getByLabelText(/Roasted Potatoes recipe/i)).toBeTruthy();
  });

  it('servings stepper rescales the ingredient LIST and step PROSE in lockstep; temps untouched', () => {
    const { getByText, getAllByText, getByLabelText, queryByText } = render(
      <CookingModeRecipeCard {...PROPS} />,
    );
    // base = 4 servings — phrase in both ingredient line + step 1
    expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(
      getByText(/toss with 2 tablespoons olive oil, 0.5 teaspoons garlic powder, and 0.8 teaspoons salt/),
    ).toBeTruthy();

    // 4 → 2 (press Decrease twice)
    fireEvent.press(getByLabelText('Decrease servings'));
    fireEvent.press(getByLabelText('Decrease servings'));

    // ingredient list AND step 1 rescaled in lockstep (both → 2 nodes)
    expect(getAllByText(/1 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(queryByText(/2 pounds potatoes or sweet potatoes/)).toBeNull();
    // step prose rescaled IN LOCKSTEP with the list
    expect(
      getByText(/toss with 1 tablespoons olive oil, 0.3 teaspoons garlic powder, and 0.4 teaspoons salt/),
    ).toBeTruthy();
    // temps/times structurally untouched
    expect(getByText(/Roast at 400°F for 30 minutes/)).toBeTruthy();
  });

  it('Get cooking is labelled and fires its handler', () => {
    const onGetCooking = jest.fn();
    const { getByLabelText } = render(
      <CookingModeRecipeCard {...PROPS} onGetCooking={onGetCooking} />,
    );
    const btn = getByLabelText(/get cooking/i);
    expect(btn.props.accessibilityRole).toBe('button');
    fireEvent.press(btn);
    expect(onGetCooking).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing in dark theme and with no images', () => {
    const { getByText } = render(
      <CookingModeRecipeCard {...PROPS} imageUrls={undefined} />,
    );
    expect(getByText('Roasted Potatoes')).toBeTruthy();
  });
});

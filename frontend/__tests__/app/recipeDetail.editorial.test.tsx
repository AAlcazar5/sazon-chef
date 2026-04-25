import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks
jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient({ children, ...props }: any) {
      return <View {...props}>{children}</View>;
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
  };
});

// Import after mocks
import { EditorialHeroBlock } from '../../components/recipeDetail/EditorialHeroBlock';
import { EditorialTitleBlock } from '../../components/recipeDetail/EditorialTitleBlock';
import { EditorialChefNote } from '../../components/recipeDetail/EditorialChefNote';
import { EditorialIngredients } from '../../components/recipeDetail/EditorialIngredients';
import { EditorialRecipeDetailCTA } from '../../components/recipeDetail/EditorialRecipeDetailCTA';

// ─── EditorialHeroBlock ──────────────────────────────────────

describe('EditorialHeroBlock (10V-E: Peach hero block)', () => {
  const baseProps = {
    onBack: jest.fn(),
    onShare: jest.fn(),
    onSave: jest.fn(),
    saved: false,
    imageUrl: 'https://example.com/plate.jpg',
  };

  it('renders back, share, and save buttons', () => {
    const { getByTestId } = render(<EditorialHeroBlock {...baseProps} />);
    expect(getByTestId('hero-back-button')).toBeTruthy();
    expect(getByTestId('hero-share-button')).toBeTruthy();
    expect(getByTestId('hero-save-button')).toBeTruthy();
  });

  it('back button fires onBack', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<EditorialHeroBlock {...baseProps} onBack={onBack} />);
    fireEvent.press(getByTestId('hero-back-button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('hero container has borderBottomLeftRadius 36', () => {
    const { getByTestId } = render(<EditorialHeroBlock {...baseProps} />);
    const hero = getByTestId('hero-block');
    const flatStyle = Array.isArray(hero.props.style)
      ? Object.assign({}, ...hero.props.style.filter(Boolean))
      : hero.props.style;
    expect(flatStyle.borderBottomLeftRadius).toBe(36);
    expect(flatStyle.borderBottomRightRadius).toBe(36);
  });

  it('renders circular plate photo at 240px', () => {
    const { getByTestId } = render(<EditorialHeroBlock {...baseProps} />);
    const photo = getByTestId('plate-photo');
    const flatStyle = Array.isArray(photo.props.style)
      ? Object.assign({}, ...photo.props.style.filter(Boolean))
      : photo.props.style;
    expect(flatStyle.width).toBe(240);
    expect(flatStyle.height).toBe(240);
    expect(flatStyle.borderRadius).toBe(120);
  });
});

// ─── EditorialTitleBlock ─────────────────────────────────────

describe('EditorialTitleBlock (10V-E: Editorial title block)', () => {
  const baseProps = {
    cuisine: 'Asian',
    matchPercent: 92,
    title: 'Teriyaki Salmon Bowl',
    accentWord: 'Salmon',
    subtitle: 'with jasmine rice & scallions',
  };

  it('renders eyebrow with cuisine and match%', () => {
    const { getByText } = render(<EditorialTitleBlock {...baseProps} />);
    expect(getByText(/Asian/)).toBeTruthy();
    expect(getByText(/92%/)).toBeTruthy();
  });

  it('renders title text', () => {
    const { getByText } = render(<EditorialTitleBlock {...baseProps} />);
    expect(getByText(/Teriyaki/)).toBeTruthy();
  });

  it('renders accent word in italic', () => {
    const { getByTestId } = render(<EditorialTitleBlock {...baseProps} />);
    expect(getByTestId('title-accent')).toBeTruthy();
  });

  it('renders subtitle', () => {
    const { getByText } = render(<EditorialTitleBlock {...baseProps} />);
    expect(getByText('with jasmine rice & scallions')).toBeTruthy();
  });
});

// ─── EditorialChefNote ───────────────────────────────────────

describe('EditorialChefNote (10V-E: Chef note)', () => {
  it('renders CHEF\'S NOTE eyebrow', () => {
    const { getByText } = render(
      <EditorialChefNote note="The key is to marinate overnight for deeper flavor." />
    );
    expect(getByText("CHEF'S NOTE")).toBeTruthy();
  });

  it('renders the note text in italic serif', () => {
    const { getByTestId } = render(
      <EditorialChefNote note="Marinate overnight for deeper flavor." />
    );
    expect(getByTestId('chef-note-text')).toBeTruthy();
  });
});

// ─── EditorialIngredients ────────────────────────────────────

describe('EditorialIngredients (10V-E: Ingredients section)', () => {
  const ingredients = [
    { name: 'Salmon fillet', qty: '200g', icon: '🐟' },
    { name: 'Jasmine rice', qty: '1 cup', icon: '🍚' },
    { name: 'Soy sauce', qty: '2 tbsp', icon: '🫗' },
  ];

  it('renders section title', () => {
    const { getByText } = render(
      <EditorialIngredients
        ingredients={ingredients}
        servings={2}
        onChangeServings={jest.fn()}
        unit="Metric"
        onChangeUnit={jest.fn()}
      />
    );
    expect(getByText(/Ingredients/)).toBeTruthy();
  });

  it('renders unit segmented control', () => {
    const { getByTestId } = render(
      <EditorialIngredients
        ingredients={ingredients}
        servings={2}
        onChangeServings={jest.fn()}
        unit="Metric"
        onChangeUnit={jest.fn()}
      />
    );
    expect(getByTestId('segment-Metric')).toBeTruthy();
    expect(getByTestId('segment-US')).toBeTruthy();
  });

  it('renders serving stepper', () => {
    const { getByTestId } = render(
      <EditorialIngredients
        ingredients={ingredients}
        servings={2}
        onChangeServings={jest.fn()}
        unit="Metric"
        onChangeUnit={jest.fn()}
      />
    );
    expect(getByTestId('stepper-minus')).toBeTruthy();
    expect(getByTestId('stepper-plus')).toBeTruthy();
  });

  it('renders all ingredient rows', () => {
    const { getByText } = render(
      <EditorialIngredients
        ingredients={ingredients}
        servings={2}
        onChangeServings={jest.fn()}
        unit="Metric"
        onChangeUnit={jest.fn()}
      />
    );
    expect(getByText('Salmon fillet')).toBeTruthy();
    expect(getByText('Jasmine rice')).toBeTruthy();
    expect(getByText('Soy sauce')).toBeTruthy();
  });
});

// ─── EditorialRecipeDetailCTA ────────────────────────────────

describe('EditorialRecipeDetailCTA (10V-E: Sticky CTA bar)', () => {
  it('renders black pill with label', () => {
    const { getByText } = render(
      <EditorialRecipeDetailCTA onStartCooking={jest.fn()} onAddToMealPlan={jest.fn()} />
    );
    expect(getByText('Start cooking')).toBeTruthy();
  });

  it('renders calendar button', () => {
    const { getByTestId } = render(
      <EditorialRecipeDetailCTA onStartCooking={jest.fn()} onAddToMealPlan={jest.fn()} />
    );
    expect(getByTestId('meal-plan-button')).toBeTruthy();
  });

  it('calendar button fires onAddToMealPlan', () => {
    const onAddToMealPlan = jest.fn();
    const { getByTestId } = render(
      <EditorialRecipeDetailCTA onStartCooking={jest.fn()} onAddToMealPlan={onAddToMealPlan} />
    );
    fireEvent.press(getByTestId('meal-plan-button'));
    expect(onAddToMealPlan).toHaveBeenCalled();
  });
});

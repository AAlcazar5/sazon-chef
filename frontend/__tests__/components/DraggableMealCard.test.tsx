// frontend/__tests__/components/DraggableMealCard.test.tsx
// Phase 4: DraggableMealCard — image thumbnail, completion toggle, press handlers, entrance animation

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DraggableMealCard from '../../components/meal-plan/DraggableMealCard';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler', () => {
  const chainable: Record<string, any> = {};
  const chain = () => chainable;
  ['onStart', 'onUpdate', 'onEnd', 'onFinalize', 'runOnJS',
   'activeOffsetX', 'failOffsetY', 'maxPointers', 'minPointers'].forEach(m => {
    chainable[m] = chain;
  });
  return {
    Gesture: { Pan: () => chainable, Tap: () => chainable },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
    State: {},
  };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity accessibilityRole="button" {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: any) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../components/ui/PulsingLoader', () => {
  const { View } = require('react-native');
  return function MockPulsingLoader() { return <View testID="pulsing-loader" />; };
});

jest.mock('../../components/meal-plan/SurpriseBadge', () => {
  const { View } = require('react-native');
  return function MockSurpriseBadge() { return <View testID="surprise-badge" />; };
});

jest.mock('../../utils/imageUtils', () => ({
  optimizedImageUrl: (url: string) => url,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeMeal = (overrides: any = {}) => ({
  id: 'meal-1',
  mealPlanMealId: 'plan-meal-1',
  name: 'Grilled Chicken',
  calories: 450,
  cookTime: 30,
  ...overrides,
});

const defaultProps = {
  meal: makeMeal(),
  hour: 12,
  mealIndex: 0,
  isDark: false,
  isDragging: false,
  isDragOver: false,
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
  onDragOver: jest.fn(),
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  onToggleComplete: jest.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DraggableMealCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the meal name', () => {
    const { getByText } = render(<DraggableMealCard {...defaultProps} />);
    expect(getByText('Grilled Chicken')).toBeTruthy();
  });

  it('renders the meal calories', () => {
    const { getByText } = render(<DraggableMealCard {...defaultProps} />);
    expect(getByText('450 calories')).toBeTruthy();
  });

  it('renders image when meal has imageUrl', () => {
    const meal = makeMeal({ imageUrl: 'https://example.com/chicken.jpg' });
    const { getByLabelText } = render(
      <DraggableMealCard {...defaultProps} meal={meal} />
    );
    expect(getByLabelText('Grilled Chicken image')).toBeTruthy();
  });

  it('does not render image when meal has no imageUrl', () => {
    const meal = makeMeal({ imageUrl: undefined });
    const { queryByLabelText } = render(
      <DraggableMealCard {...defaultProps} meal={meal} />
    );
    expect(queryByLabelText('Grilled Chicken image')).toBeNull();
  });

  it('calls onPress when the card is tapped', () => {
    const onPress = jest.fn();
    const { getAllByRole } = render(
      <DraggableMealCard {...defaultProps} onPress={onPress} />
    );
    // The inner HapticTouchableOpacity wraps the card content
    fireEvent.press(getAllByRole('button')[0]);
    expect(onPress).toHaveBeenCalled();
  });

  it('calls onLongPress when the card is long-pressed', () => {
    const onLongPress = jest.fn();
    const { getAllByRole } = render(
      <DraggableMealCard {...defaultProps} onLongPress={onLongPress} />
    );
    fireEvent(getAllByRole('button')[0], 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });

  it('renders completion switch when onToggleComplete is provided', () => {
    const { getByRole } = render(<DraggableMealCard {...defaultProps} />);
    expect(getByRole('switch')).toBeTruthy();
  });

  it('calls onToggleComplete when switch is toggled', () => {
    const onToggleComplete = jest.fn();
    const { getByRole } = render(
      <DraggableMealCard {...defaultProps} onToggleComplete={onToggleComplete} />
    );
    fireEvent(getByRole('switch'), 'valueChange', true);
    expect(onToggleComplete).toHaveBeenCalledWith('plan-meal-1', true);
  });

  it('switch reflects isCompleted=true', () => {
    const { getByRole } = render(
      <DraggableMealCard {...defaultProps} isCompleted={true} />
    );
    const sw = getByRole('switch');
    expect(sw.props.value).toBe(true);
  });

  it('switch reflects isCompleted=false', () => {
    const { getByRole } = render(
      <DraggableMealCard {...defaultProps} isCompleted={false} />
    );
    expect(getByRole('switch').props.value).toBe(false);
  });

  it('renders cook time when cookTime is set', () => {
    const { getByText } = render(<DraggableMealCard {...defaultProps} />);
    expect(getByText('30 min')).toBeTruthy();
  });

  it('shows hours format for cook time ≥ 60', () => {
    const meal = makeMeal({ cookTime: 90 });
    const { getByText } = render(<DraggableMealCard {...defaultProps} meal={meal} />);
    expect(getByText('1h 30min')).toBeTruthy();
  });

  it('renders without crashing when optional props are absent', () => {
    const minProps = {
      meal: makeMeal({ cookTime: undefined }),
      hour: 8,
      mealIndex: 2,
      isDark: true,
      isDragging: false,
      isDragOver: false,
      onDragStart: jest.fn(),
      onDragEnd: jest.fn(),
      onDragOver: jest.fn(),
      onPress: jest.fn(),
      onLongPress: jest.fn(),
    };
    const { getByText } = render(<DraggableMealCard {...minProps} />);
    expect(getByText('Grilled Chicken')).toBeTruthy();
  });

  it('mealIndex-based stagger: card renders at any index without crashing', () => {
    const { getByText } = render(
      <DraggableMealCard {...defaultProps} mealIndex={4} />
    );
    expect(getByText('Grilled Chicken')).toBeTruthy();
  });

  // ── Swipe-right: mark as cooked ────────────────────────────────────────────
  // Swipe right triggers onToggleComplete(mealPlanMealId, true) — the gesture
  // handler is mocked, so we verify the same semantic via the Switch toggle
  // which exercises the identical callback path.

  it('swipe-right (mark cooked): onToggleComplete called with correct mealPlanMealId', () => {
    const onToggleComplete = jest.fn();
    const meal = makeMeal({ mealPlanMealId: 'specific-plan-id-42' });
    const { getByRole } = render(
      <DraggableMealCard
        {...defaultProps}
        meal={meal}
        isCompleted={false}
        onToggleComplete={onToggleComplete}
      />
    );
    fireEvent(getByRole('switch'), 'valueChange', true);
    expect(onToggleComplete).toHaveBeenCalledWith('specific-plan-id-42', true);
  });

  it('swipe-right (unmark cooked): onToggleComplete called with false when already complete', () => {
    const onToggleComplete = jest.fn();
    const meal = makeMeal({ mealPlanMealId: 'plan-meal-99' });
    const { getByRole } = render(
      <DraggableMealCard
        {...defaultProps}
        meal={meal}
        isCompleted={true}
        onToggleComplete={onToggleComplete}
      />
    );
    fireEvent(getByRole('switch'), 'valueChange', false);
    expect(onToggleComplete).toHaveBeenCalledWith('plan-meal-99', false);
  });

  // ── Swipe-left: open options / swap ────────────────────────────────────────
  // Swipe left fires onLongPress — the swap UI expands inline in the card
  // (no separate sheet). Verify onLongPress fires and card doesn't crash.

  it('swipe-left: onLongPress is called when long-pressing the card', () => {
    const onLongPress = jest.fn();
    const { getAllByRole } = render(
      <DraggableMealCard {...defaultProps} onLongPress={onLongPress} />
    );
    fireEvent(getAllByRole('button')[0], 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('swipe-left does not call onToggleComplete (only long-press fires)', () => {
    const onToggleComplete = jest.fn();
    const onLongPress = jest.fn();
    const { getAllByRole } = render(
      <DraggableMealCard
        {...defaultProps}
        onLongPress={onLongPress}
        onToggleComplete={onToggleComplete}
      />
    );
    fireEvent(getAllByRole('button')[0], 'longPress');
    expect(onLongPress).toHaveBeenCalled();
    expect(onToggleComplete).not.toHaveBeenCalled();
  });
});

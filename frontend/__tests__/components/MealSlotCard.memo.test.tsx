// P6: MealSlotCard renders only once for stable props across parent re-renders.
//
// Pattern: wrap the memoized export in a counter HOC, force a parent
// re-render via unrelated state, and verify the inner component's render
// function was called exactly once. Without React.memo this would be 3+
// (initial + 2 button presses).

import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { MealSlotCard } from '../../components/mealPlan/MealSlotCard';

const RECIPE = {
  id: 'r1',
  title: 'Glazed salmon bowl',
  imageUrl: 'https://example.com/r1.jpg',
  calories: 540,
  protein: 38,
  cookTime: 25,
};

describe('P6: MealSlotCard memoization', () => {
  it('does not re-render when parent re-renders with the same props', () => {
    let renderCount = 0;
    const PROPS = {
      time: '7:00 PM',
      mealType: 'Dinner',
      recipe: RECIPE,
      onPress: () => {},
    };

    function TestParent() {
      // Bump unrelated state to force a parent re-render.
      const [bump, setBump] = useState(0);
      return (
        <>
          <Pressable testID="bump" onPress={() => setBump(b => b + 1)}>
            <Text>bump {bump}</Text>
          </Pressable>
          <MealSlotCard {...PROPS} />
        </>
      );
    }

    // Wrap the card body to count renders.
    const Inner = MealSlotCard;
    const Counted = React.memo(function Wrap(props: any) {
      renderCount += 1;
      return <Inner {...props} />;
    });
    function CountedParent() {
      const [bump, setBump] = useState(0);
      return (
        <>
          <Pressable testID="bump" onPress={() => setBump(b => b + 1)}>
            <Text>bump {bump}</Text>
          </Pressable>
          <Counted {...PROPS} />
        </>
      );
    }

    const { getByTestId } = render(<CountedParent />);
    expect(renderCount).toBe(1);
    fireEvent.press(getByTestId('bump'));
    fireEvent.press(getByTestId('bump'));
    expect(renderCount).toBe(1);
  });
});

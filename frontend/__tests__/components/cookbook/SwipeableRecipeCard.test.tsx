// frontend/__tests__/components/cookbook/SwipeableRecipeCard.test.tsx
// Tests for SwipeableRecipeCard swipe-to-edit drawer

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SwipeableRecipeCard from '../../../components/cookbook/SwipeableRecipeCard';

// ── Mocks ─────────────────────────────────────────────────────────────────────

let capturedRenderRightActions: any = null;

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const React = require('react');
  const MockSwipeable = React.forwardRef(function MockSwipeable(props: any, ref: any) {
    // Capture renderRightActions so we can invoke it in tests
    capturedRenderRightActions = props.renderRightActions;
    return <View testID="swipeable">{props.children}</View>;
  });
  return { Swipeable: MockSwipeable };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderActions() {
  if (!capturedRenderRightActions) throw new Error('renderRightActions not captured');
  const { Animated } = require('react-native');
  const mockAnimatedValue = new Animated.Value(0);
  return capturedRenderRightActions(mockAnimatedValue, mockAnimatedValue);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SwipeableRecipeCard', () => {
  beforeEach(() => {
    capturedRenderRightActions = null;
  });

  it('renders children directly when disabled', () => {
    const { getByText, queryByTestId } = render(
      <SwipeableRecipeCard disabled onEdit={() => {}} onNotes={() => {}}>
        <Text>Recipe Content</Text>
      </SwipeableRecipeCard>
    );
    expect(getByText('Recipe Content')).toBeTruthy();
    expect(queryByTestId('swipeable')).toBeNull();
  });

  it('renders children directly when no callbacks provided', () => {
    const { getByText, queryByTestId } = render(
      <SwipeableRecipeCard>
        <Text>Recipe Content</Text>
      </SwipeableRecipeCard>
    );
    expect(getByText('Recipe Content')).toBeTruthy();
    expect(queryByTestId('swipeable')).toBeNull();
  });

  it('wraps children in Swipeable when callbacks are provided', () => {
    const { getByText, getByTestId } = render(
      <SwipeableRecipeCard onEdit={() => {}}>
        <Text>Recipe Content</Text>
      </SwipeableRecipeCard>
    );
    expect(getByTestId('swipeable')).toBeTruthy();
    expect(getByText('Recipe Content')).toBeTruthy();
  });

  it('renders Edit action button when onEdit is provided', () => {
    render(
      <SwipeableRecipeCard onEdit={() => {}}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByText } = render(actions);
    expect(getByText('Edit')).toBeTruthy();
  });

  it('renders Notes action button when onNotes is provided', () => {
    render(
      <SwipeableRecipeCard onNotes={() => {}}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByText } = render(actions);
    expect(getByText('Notes')).toBeTruthy();
  });

  it('renders Move action button when onCollection is provided', () => {
    render(
      <SwipeableRecipeCard onCollection={() => {}}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByText } = render(actions);
    expect(getByText('Move')).toBeTruthy();
  });

  it('renders all three action buttons when all callbacks provided', () => {
    render(
      <SwipeableRecipeCard onEdit={() => {}} onNotes={() => {}} onCollection={() => {}}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByText } = render(actions);
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();
    expect(getByText('Move')).toBeTruthy();
  });

  it('calls onEdit when Edit action is pressed', () => {
    const onEdit = jest.fn();
    render(
      <SwipeableRecipeCard onEdit={onEdit}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByLabelText } = render(actions);
    fireEvent.press(getByLabelText('Quick edit recipe'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onNotes when Notes action is pressed', () => {
    const onNotes = jest.fn();
    render(
      <SwipeableRecipeCard onNotes={onNotes}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByLabelText } = render(actions);
    fireEvent.press(getByLabelText('Edit notes'));
    expect(onNotes).toHaveBeenCalled();
  });

  it('calls onCollection when Move action is pressed', () => {
    const onCollection = jest.fn();
    render(
      <SwipeableRecipeCard onCollection={onCollection}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByLabelText } = render(actions);
    fireEvent.press(getByLabelText('Change collection'));
    expect(onCollection).toHaveBeenCalled();
  });

  it('has correct accessibility labels on action buttons', () => {
    render(
      <SwipeableRecipeCard onEdit={() => {}} onNotes={() => {}} onCollection={() => {}}>
        <Text>Card</Text>
      </SwipeableRecipeCard>
    );
    const actions = renderActions();
    const { getByLabelText } = render(actions);
    expect(getByLabelText('Quick edit recipe')).toBeTruthy();
    expect(getByLabelText('Edit notes')).toBeTruthy();
    expect(getByLabelText('Change collection')).toBeTruthy();
  });
});

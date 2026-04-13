// frontend/__tests__/components/LeftoverIdeasSheet.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'dark' }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockLeftoverIdeas = jest.fn();
jest.mock('../../lib/api', () => ({
  pantryApi: {
    leftoverIdeas: (...args: any[]) => mockLeftoverIdeas(...args),
  },
}));

import LeftoverIdeasSheet from '../../components/cooking/LeftoverIdeasSheet';

const sampleRecipes = [
  {
    id: 'l1',
    title: 'Fried Rice',
    cuisine: 'Chinese',
    cookTime: 15,
    calories: 380,
    protein: 20,
    reuseCount: 3,
  },
  {
    id: 'l2',
    title: 'Congee',
    cuisine: 'Cantonese',
    cookTime: 45,
    calories: 280,
    protein: 15,
    reuseCount: 2,
  },
];

describe('LeftoverIdeasSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeftoverIdeas.mockResolvedValue({ data: { recipes: sampleRecipes } });
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <LeftoverIdeasSheet
        visible={false}
        ingredients={['rice', 'chicken']}
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    expect(queryByTestId('leftover-ideas-sheet')).toBeNull();
    expect(mockLeftoverIdeas).not.toHaveBeenCalled();
  });

  it('fetches leftover ideas when visible=true', async () => {
    render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={['rice', 'chicken']}
        excludeRecipeId="source-1"
        excludeCuisine="Thai"
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(mockLeftoverIdeas).toHaveBeenCalledWith(['rice', 'chicken'], {
        excludeRecipeId: 'source-1',
        excludeCuisine: 'Thai',
        limit: 5,
      });
    });
  });

  it('renders recipe cards once loaded', async () => {
    const { getByTestId } = render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={['rice', 'chicken']}
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(getByTestId('leftover-idea-l1')).toBeTruthy();
      expect(getByTestId('leftover-idea-l2')).toBeTruthy();
    });
  });

  it('calls onSelectRecipe and onClose when card tapped', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={['rice', 'chicken']}
        onClose={onClose}
        onSelectRecipe={onSelect}
      />
    );
    await waitFor(() => getByTestId('leftover-idea-l1'));
    fireEvent.press(getByTestId('leftover-idea-l1'));
    expect(onSelect).toHaveBeenCalledWith('l1');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when API returns zero recipes', async () => {
    mockLeftoverIdeas.mockResolvedValue({ data: { recipes: [] } });
    const { queryByTestId } = render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={['rice', 'chicken']}
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(mockLeftoverIdeas).toHaveBeenCalled();
    });
    // After load completes with empty results, sheet unmounts
    await waitFor(() => {
      expect(queryByTestId('leftover-ideas-sheet')).toBeNull();
    });
  });

  it('handles API error silently', async () => {
    mockLeftoverIdeas.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={['rice', 'chicken']}
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    await waitFor(() => {
      expect(queryByTestId('leftover-ideas-sheet')).toBeNull();
    });
  });

  it('does not fetch when ingredients array is empty', () => {
    render(
      <LeftoverIdeasSheet
        visible={true}
        ingredients={[]}
        onClose={jest.fn()}
        onSelectRecipe={jest.fn()}
      />
    );
    expect(mockLeftoverIdeas).not.toHaveBeenCalled();
  });
});

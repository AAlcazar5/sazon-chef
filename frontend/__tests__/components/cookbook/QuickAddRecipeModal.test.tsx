// frontend/__tests__/components/cookbook/QuickAddRecipeModal.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import QuickAddRecipeModal from '../../../components/cookbook/QuickAddRecipeModal';
import { recipeApi } from '../../../lib/api';

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    createRecipe: jest.fn(),
  },
}));

jest.mock('../../mascot/AnimatedLottieMascot', () => 'AnimatedLottieMascot', { virtual: true });

describe('QuickAddRecipeModal', () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (recipeApi.createRecipe as jest.Mock).mockResolvedValue({
      data: { data: { id: 'r1', title: 'Oat Pancakes' } },
    });
  });

  it('renders title and core fields when visible', () => {
    const { getByText, getByPlaceholderText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );
    expect(getByText('Quick Add Recipe')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Oat Protein Pancakes')).toBeTruthy();
    expect(getByPlaceholderText(/One ingredient per line/i)).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <QuickAddRecipeModal visible={false} onClose={onClose} onSuccess={onSuccess} />
    );
    expect(queryByText('Quick Add Recipe')).toBeNull();
  });

  it('shows validation error when saving with empty title', async () => {
    const { getByText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );
    fireEvent.press(getByText('Save Recipe'));
    await waitFor(() => {
      expect(getByText(/name your recipe/i)).toBeTruthy();
    });
    expect(recipeApi.createRecipe).not.toHaveBeenCalled();
  });

  it('submits recipe with title + parsed ingredients + macros', async () => {
    const { getByText, getByPlaceholderText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );

    fireEvent.changeText(getByPlaceholderText('e.g. Oat Protein Pancakes'), 'Oat Pancakes');
    fireEvent.changeText(
      getByPlaceholderText(/One ingredient per line/i),
      '1 cup oats\n1 scoop protein\n\n2 eggs'
    );
    fireEvent.changeText(getByPlaceholderText('Protein (g)'), '32');
    fireEvent.changeText(getByPlaceholderText('Calories'), '410');

    await act(async () => {
      fireEvent.press(getByText('Save Recipe'));
    });

    expect(recipeApi.createRecipe).toHaveBeenCalledTimes(1);
    const payload = (recipeApi.createRecipe as jest.Mock).mock.calls[0][0];
    expect(payload.title).toBe('Oat Pancakes');
    expect(payload.ingredients).toEqual(['1 cup oats', '1 scoop protein', '2 eggs']);
    expect(payload.protein).toBe(32);
    expect(payload.calories).toBe(410);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('passes activeCollectionId to backend when provided', async () => {
    const { getByText, getByPlaceholderText } = render(
      <QuickAddRecipeModal
        visible
        onClose={onClose}
        onSuccess={onSuccess}
        activeCollectionId="col-123"
      />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Oat Protein Pancakes'), 'Test');

    await act(async () => {
      fireEvent.press(getByText('Save Recipe'));
    });

    const payload = (recipeApi.createRecipe as jest.Mock).mock.calls[0][0];
    expect(payload.collectionIds).toEqual(['col-123']);
  });

  it('omits macros when left blank', async () => {
    const { getByText, getByPlaceholderText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Oat Protein Pancakes'), 'Simple Recipe');

    await act(async () => {
      fireEvent.press(getByText('Save Recipe'));
    });

    const payload = (recipeApi.createRecipe as jest.Mock).mock.calls[0][0];
    expect(payload.protein).toBe(0);
    expect(payload.calories).toBe(0);
  });

  it('calls onClose when close button tapped', () => {
    const { getByLabelText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );
    fireEvent.press(getByLabelText('Close quick add'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error state if createRecipe fails', async () => {
    (recipeApi.createRecipe as jest.Mock).mockRejectedValueOnce(new Error('nope'));
    const { getByText, getByPlaceholderText, findByText } = render(
      <QuickAddRecipeModal visible onClose={onClose} onSuccess={onSuccess} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Oat Protein Pancakes'), 'Test');
    await act(async () => {
      fireEvent.press(getByText('Save Recipe'));
    });
    expect(await findByText(/couldn't save/i)).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

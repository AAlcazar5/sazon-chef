// frontend/__tests__/components/recipe/AIDescriptionAssist.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AIDescriptionAssist from '../../../components/recipe/AIDescriptionAssist';
import { recipeApi } from '../../../lib/api';

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    generateFromDescription: jest.fn(),
  },
}));

describe('AIDescriptionAssist', () => {
  const onRecipeGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (recipeApi.generateFromDescription as jest.Mock).mockResolvedValue({
      data: {
        data: {
          recipe: {
            title: 'Oat Pancakes',
            description: 'Fluffy high-protein pancakes.',
            cookTime: 15,
            cuisine: 'American',
            protein: 32,
            calories: 410,
            ingredients: ['50g oats', '1 scoop protein'],
            instructions: ['Blend oats', 'Cook'],
          },
        },
      },
    });
  });

  it('renders prompt input and generate button', () => {
    const { getByPlaceholderText, getByText } = render(
      <AIDescriptionAssist onRecipeGenerated={onRecipeGenerated} />
    );
    expect(getByPlaceholderText(/describe what you made/i)).toBeTruthy();
    expect(getByText(/let sazon help/i)).toBeTruthy();
  });

  it('disables CTA when input is empty', () => {
    const { getByTestId } = render(
      <AIDescriptionAssist onRecipeGenerated={onRecipeGenerated} />
    );
    const btn = getByTestId('ai-assist-cta');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls generateFromDescription with trimmed text and forwards recipe on success', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <AIDescriptionAssist onRecipeGenerated={onRecipeGenerated} />
    );
    fireEvent.changeText(
      getByPlaceholderText(/describe what you made/i),
      '  oat protein pancakes with chia seeds  '
    );
    await act(async () => {
      fireEvent.press(getByTestId('ai-assist-cta'));
    });

    expect(recipeApi.generateFromDescription).toHaveBeenCalledWith(
      'oat protein pancakes with chia seeds'
    );
    expect(onRecipeGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Oat Pancakes',
        protein: 32,
        ingredients: ['50g oats', '1 scoop protein'],
      })
    );
  });

  it('shows error message if API fails', async () => {
    (recipeApi.generateFromDescription as jest.Mock).mockRejectedValueOnce(
      new Error('boom')
    );
    const { getByPlaceholderText, getByTestId, findByText } = render(
      <AIDescriptionAssist onRecipeGenerated={onRecipeGenerated} />
    );
    fireEvent.changeText(getByPlaceholderText(/describe what you made/i), 'something');
    await act(async () => {
      fireEvent.press(getByTestId('ai-assist-cta'));
    });
    expect(await findByText(/couldn't generate/i)).toBeTruthy();
    expect(onRecipeGenerated).not.toHaveBeenCalled();
  });

  it('does not fire when already generating', async () => {
    let resolveGen: (v: any) => void = () => {};
    (recipeApi.generateFromDescription as jest.Mock).mockReturnValueOnce(
      new Promise((r) => {
        resolveGen = r;
      })
    );
    const { getByPlaceholderText, getByTestId } = render(
      <AIDescriptionAssist onRecipeGenerated={onRecipeGenerated} />
    );
    fireEvent.changeText(getByPlaceholderText(/describe what you made/i), 'x');
    fireEvent.press(getByTestId('ai-assist-cta'));
    fireEvent.press(getByTestId('ai-assist-cta'));

    await act(async () => {
      resolveGen({ data: { data: { recipe: { title: 'A', ingredients: [], instructions: [] } } } });
    });

    expect(recipeApi.generateFromDescription).toHaveBeenCalledTimes(1);
  });
});

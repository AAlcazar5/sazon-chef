// ROADMAP 4.0 RD7.1 — recipe-detail telemetry tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

import * as analytics from '../../lib/analytics';
import MoreLikeThisRow from '../../components/recipe/MoreLikeThisRow';
import RecipeVariantChipRow from '../../components/recipe/RecipeVariantChipRow';
import LeftoverBridgeCard from '../../components/recipe/LeftoverBridgeCard';
import RecipeDetailActionMenu from '../../components/recipe/RecipeDetailActionMenu';

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockSimilar = jest.fn();
const mockBridge = jest.fn();
jest.mock('../../lib/api', () => ({
  recipeApi: {
    getSimilarRecipes: (id: string, k?: number) => mockSimilar(id, k),
    getLeftoverBridge: (k?: number) => mockBridge(k),
  },
}));

let trackSpy: jest.SpyInstance;
beforeEach(() => {
  trackSpy = jest.spyOn(analytics, 'track').mockImplementation(() => undefined);
  mockSimilar.mockReset();
  mockBridge.mockReset();
});
afterEach(() => {
  trackSpy.mockRestore();
});

describe('recipe-detail telemetry (RD7.1)', () => {
  it('similar-tap fires recipe_detail_similar_tap with anchor + target + position', async () => {
    mockSimilar.mockResolvedValue({
      data: {
        recipes: [
          { id: 'r1', title: 'R1', cuisine: 'Italian', cookTime: 25, imageUrl: null },
          { id: 'r2', title: 'R2', cuisine: 'Thai', cookTime: 20, imageUrl: null },
        ],
      },
    });
    const { findByTestId } = renderWithProviders(
      <MoreLikeThisRow recipeId="anchor" />,
    );
    fireEvent.press(await findByTestId('more-like-this-card-r2'));
    expect(trackSpy).toHaveBeenCalledWith(
      'recipe_detail_similar_tap',
      expect.objectContaining({
        anchorRecipeId: 'anchor',
        targetRecipeId: 'r2',
        position: 1,
      }),
    );
  });

  it('variant-tap fires recipe_detail_variant_tap with tag + target', () => {
    const { getByTestId } = renderWithProviders(
      <RecipeVariantChipRow
        variants={[{ tag: 'lighter', siblingRecipe: { id: 's1', title: 'Lighter' } }]}
      />,
    );
    fireEvent.press(getByTestId('recipe-variant-chip-lighter'));
    expect(trackSpy).toHaveBeenCalledWith(
      'recipe_detail_variant_tap',
      expect.objectContaining({ tag: 'lighter', targetRecipeId: 's1' }),
    );
  });

  it('bridge-tap fires recipe_detail_bridge_tap with leftover + target', async () => {
    mockBridge.mockResolvedValue({
      data: { rows: [{ leftoverIngredient: 'cilantro', expiringIn: 1, recipes: [{ id: 'r1', title: 'R', cuisine: null, cookTime: null, imageUrl: null }] }] },
    });
    const { findByTestId } = renderWithProviders(<LeftoverBridgeCard />);
    fireEvent.press(await findByTestId('leftover-bridge-pill-r1'));
    expect(trackSpy).toHaveBeenCalledWith(
      'recipe_detail_bridge_tap',
      expect.objectContaining({ leftoverIngredient: 'cilantro', targetRecipeId: 'r1', expiringIn: 1 }),
    );
  });

  it('menu_open fires recipe_detail_menu_open', () => {
    const { getByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed canExportMenu onShare={() => undefined} />,
    );
    fireEvent.press(getByTestId('recipe-detail-action-menu-trigger'));
    expect(trackSpy).toHaveBeenCalledWith('recipe_detail_menu_open');
  });

  it('does not fire any event on render alone', async () => {
    mockSimilar.mockResolvedValue({ data: { recipes: [] } });
    renderWithProviders(<MoreLikeThisRow recipeId="anchor" />);
    await waitFor(() => expect(mockSimilar).toHaveBeenCalled());
    // No tap = no track call.
    expect(trackSpy).not.toHaveBeenCalled();
  });
});

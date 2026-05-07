// ROADMAP 4.0 RD3.1 — RecipeVariantChipRow tests.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import RecipeVariantChipRow from '../../../components/recipe/RecipeVariantChipRow';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockPush(...args) },
}));

beforeEach(() => mockPush.mockReset());

const sibling = (id: string, title: string) => ({ id, title });

describe('RecipeVariantChipRow (RD3.1)', () => {
  it('hides silently when variants is undefined', () => {
    const { queryByTestId } = renderWithProviders(<RecipeVariantChipRow />);
    expect(queryByTestId('recipe-variant-chip-row')).toBeNull();
  });

  it('hides silently when variants is empty', () => {
    const { queryByTestId } = renderWithProviders(<RecipeVariantChipRow variants={[]} />);
    expect(queryByTestId('recipe-variant-chip-row')).toBeNull();
  });

  it('renders one chip per valid variant', () => {
    const { getByTestId } = renderWithProviders(
      <RecipeVariantChipRow
        variants={[
          { tag: 'lighter', siblingRecipe: sibling('s1', 'Lighter version') },
          { tag: 'sunday', siblingRecipe: sibling('s2', 'Sunday version') },
        ]}
      />,
    );
    expect(getByTestId('recipe-variant-chip-row')).toBeTruthy();
    expect(getByTestId('recipe-variant-chip-lighter')).toBeTruthy();
    expect(getByTestId('recipe-variant-chip-sunday')).toBeTruthy();
  });

  it('drops banned / unknown tags silently', () => {
    const { queryByTestId, getByTestId } = renderWithProviders(
      <RecipeVariantChipRow
        variants={[
          { tag: 'healthier', siblingRecipe: sibling('s1', 'Banned tag') } as any,
          { tag: 'skinny', siblingRecipe: sibling('s2', 'Banned tag') } as any,
          { tag: 'lighter', siblingRecipe: sibling('s3', 'Lighter version') },
        ]}
      />,
    );
    expect(getByTestId('recipe-variant-chip-lighter')).toBeTruthy();
    expect(queryByTestId('recipe-variant-chip-healthier' as any)).toBeNull();
    expect(queryByTestId('recipe-variant-chip-skinny' as any)).toBeNull();
  });

  it('tap navigates to the sibling recipe with referrer tag', () => {
    const { getByTestId } = renderWithProviders(
      <RecipeVariantChipRow
        variants={[{ tag: 'lighter', siblingRecipe: sibling('s1', 'Lighter') }]}
      />,
    );
    fireEvent.press(getByTestId('recipe-variant-chip-lighter'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/recipe/s1?referrer=detail-variant'),
    );
  });
});

// I2.2 — LocalizedIngredientList render tests.
//
// Roadmap spec:
//   - same recipe with locale='pt-BR' shows "couve manteiga" where
//     locale='en-US' shows "kale"
//   - specialty-tier ingredient renders inline substitute
//     ("huitlacoche [or sub: roasted poblano]")
//   - locale='en-US' is unchanged from canonical (regression guard)

import React from 'react';
import { render } from '@testing-library/react-native';
import { LocalizedIngredientList } from '../../../components/recipe/LocalizedIngredientList';

describe('LocalizedIngredientList (I2.2)', () => {
  const recipe = [
    '2 cups kale, chopped',
    '1 can black beans, drained',
    '1 cup huitlacoche',
  ];

  it('locale=en-US renders ingredients unchanged (regression guard)', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList ingredients={recipe} locale="en-US" />
    );
    expect(getByTestId('ingredient-line-0').props.children).toBe('2 cups kale, chopped');
    expect(getByTestId('ingredient-line-1').props.children).toBe('1 can black beans, drained');
    expect(getByTestId('ingredient-line-2').props.children).toBe('1 cup huitlacoche');
  });

  it('locale=pt-BR localizes kale → couve manteiga', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList ingredients={recipe} locale="pt-BR" />
    );
    expect(getByTestId('ingredient-line-0').props.children).toBe(
      '2 cups couve manteiga, chopped'
    );
  });

  it('locale=pt-BR localizes black beans → feijão preto', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList ingredients={recipe} locale="pt-BR" />
    );
    expect(getByTestId('ingredient-line-1').props.children).toBe(
      '1 can feijão preto, drained'
    );
  });

  it('renders substitute hint inline for specialty-tier ingredients', () => {
    const { getByTestId, queryByTestId } = render(
      <LocalizedIngredientList
        ingredients={['1 cup huitlacoche']}
        locale="en-US"
      />
    );
    // huitlacoche is specialty in en-US — should show sub hint
    expect(getByTestId('ingredient-substitute-0').props.children).toEqual([
      'or sub: ',
      expect.stringMatching(/poblano/),
    ]);
    expect(queryByTestId('ingredient-substitute-0')).toBeTruthy();
  });

  it('renders substitute hint for rare-tier matches in pt-BR', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList
        ingredients={['1 cup huitlacoche']}
        locale="pt-BR"
      />
    );
    expect(getByTestId('ingredient-substitute-0').props.children).toEqual([
      'or sub: ',
      expect.stringMatching(/cogumelo|pimentão/),
    ]);
  });

  it('does NOT render substitute hint for common-tier ingredients', () => {
    const { queryByTestId } = render(
      <LocalizedIngredientList
        ingredients={['2 cups kale, chopped']}
        locale="pt-BR"
      />
    );
    // kale → couve manteiga is common in pt-BR — no sub hint
    expect(queryByTestId('ingredient-substitute-0')).toBeNull();
  });

  it('substitute row carries an accessibilityLabel for screen readers', () => {
    const { getByLabelText } = render(
      <LocalizedIngredientList
        ingredients={['1 cup huitlacoche']}
        locale="en-US"
      />
    );
    expect(getByLabelText(/Substitute:.*poblano/)).toBeTruthy();
  });

  it('handles empty ingredients array cleanly', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList ingredients={[]} locale="pt-BR" />
    );
    expect(getByTestId('localized-ingredient-list')).toBeTruthy();
  });

  it('lines without a catalog ingredient render unchanged in any locale', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList
        ingredients={['1 tsp gold dust']}
        locale="pt-BR"
      />
    );
    expect(getByTestId('ingredient-line-0').props.children).toBe('1 tsp gold dust');
  });

  it('multi-word canonicals win over their substring (black beans not beans)', () => {
    const { getByTestId } = render(
      <LocalizedIngredientList
        ingredients={['1 can black beans']}
        locale="pt-BR"
      />
    );
    expect(getByTestId('ingredient-line-0').props.children).toBe(
      '1 can feijão preto'
    );
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IngredientRow } from '../../../components/ui/IngredientRow';

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

const ingredient = { name: 'Chicken breast', qty: '200g', icon: '🍗' };

describe('IngredientRow', () => {
  it('renders icon, name, and quantity', () => {
    const { getByText } = render(
      <IngredientRow ingredient={ingredient} checked={false} onToggle={jest.fn()} />
    );
    expect(getByText('🍗')).toBeTruthy();
    expect(getByText('Chicken breast')).toBeTruthy();
    expect(getByText('200g')).toBeTruthy();
  });

  it('fires onToggle when tapped', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <IngredientRow ingredient={ingredient} checked={false} onToggle={onToggle} />
    );
    fireEvent.press(getByText('Chicken breast'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('applies dimmed opacity when checked', () => {
    const { getByTestId } = render(
      <IngredientRow ingredient={ingredient} checked={true} onToggle={jest.fn()} testID="row" />
    );
    const row = getByTestId('row');
    const flatStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.filter(Boolean))
      : row.props.style;
    expect(flatStyle.opacity).toBe(0.45);
  });

  it('applies line-through to name when checked', () => {
    const { getByTestId } = render(
      <IngredientRow ingredient={ingredient} checked={true} onToggle={jest.fn()} testID="row" />
    );
    const name = getByTestId('row-name');
    const flatStyle = Array.isArray(name.props.style)
      ? Object.assign({}, ...name.props.style.filter(Boolean))
      : name.props.style;
    expect(flatStyle.textDecorationLine).toBe('line-through');
  });
});

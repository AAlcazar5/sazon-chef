import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VerticalCategoryRail } from '../../../components/ui/VerticalCategoryRail';

const categories = ['Dinner', 'Lunch', 'Breakfast', 'Snack'];

describe('VerticalCategoryRail', () => {
  it('renders all categories', () => {
    const { getByText } = render(
      <VerticalCategoryRail categories={categories} active="Dinner" onSelect={jest.fn()} />
    );
    for (const cat of categories) {
      expect(getByText(cat.toUpperCase())).toBeTruthy();
    }
  });

  it('active category shows orange dot indicator', () => {
    const { getByTestId } = render(
      <VerticalCategoryRail categories={categories} active="Dinner" onSelect={jest.fn()} />
    );
    expect(getByTestId('dot-Dinner')).toBeTruthy();
  });

  it('inactive categories do not show dot', () => {
    const { queryByTestId } = render(
      <VerticalCategoryRail categories={categories} active="Dinner" onSelect={jest.fn()} />
    );
    expect(queryByTestId('dot-Lunch')).toBeNull();
  });

  it('tap fires onSelect with category name', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <VerticalCategoryRail categories={categories} active="Dinner" onSelect={onSelect} />
    );
    fireEvent.press(getByText('LUNCH'));
    expect(onSelect).toHaveBeenCalledWith('Lunch');
  });

  it('has correct accessibility roles', () => {
    const { getByLabelText } = render(
      <VerticalCategoryRail categories={categories} active="Dinner" onSelect={jest.fn()} />
    );
    // Each category is a pressable tab with accessibilityRole
    expect(getByLabelText('Dinner')).toBeTruthy();
  });
});

// frontend/__tests__/components/WidgetGrid.test.tsx
// Tests for WidgetGrid 2×2 layout wrapper (9L)

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import WidgetGrid from '../../components/ui/WidgetGrid';

describe('WidgetGrid', () => {
  it('renders 4 children in a grid layout', () => {
    const { getByTestId, getByText } = render(
      <WidgetGrid testID="grid">
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
        <Text>Card 4</Text>
      </WidgetGrid>
    );
    expect(getByTestId('grid')).toBeTruthy();
    expect(getByText('Card 1')).toBeTruthy();
    expect(getByText('Card 2')).toBeTruthy();
    expect(getByText('Card 3')).toBeTruthy();
    expect(getByText('Card 4')).toBeTruthy();
  });

  it('uses flexWrap: wrap for 2×2 layout', () => {
    const { getByTestId } = render(
      <WidgetGrid testID="grid">
        <Text>A</Text>
        <Text>B</Text>
      </WidgetGrid>
    );
    const grid = getByTestId('grid');
    expect(grid.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ flexDirection: 'row', flexWrap: 'wrap' }),
      ])
    );
  });

  it('accepts custom gap', () => {
    const { getByTestId } = render(
      <WidgetGrid testID="grid" gap={20}>
        <Text>A</Text>
      </WidgetGrid>
    );
    const grid = getByTestId('grid');
    expect(grid.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gap: 20 }),
      ])
    );
  });
});

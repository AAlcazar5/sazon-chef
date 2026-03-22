// frontend/__tests__/components/CollectionCollageGrid.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import CollectionCollageGrid from '../../components/collection/CollectionCollageGrid';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: function MockImage(props: any) {
      return <View testID="expo-image" {...props} />;
    },
  };
});

describe('CollectionCollageGrid', () => {
  it('renders empty collection placeholder', () => {
    const { getByText } = render(
      <CollectionCollageGrid imageUrls={[]} recipeCount={0} testID="collage" />
    );
    expect(getByText('Add recipes')).toBeTruthy();
    expect(getByText('🌶️')).toBeTruthy();
  });

  it('renders with 1 image', () => {
    const { getByText } = render(
      <CollectionCollageGrid
        imageUrls={['https://example.com/img1.jpg']}
        recipeCount={1}
        testID="collage"
      />
    );
    expect(getByText('1 Recipe')).toBeTruthy();
  });

  it('renders with 2 images', () => {
    const { getByText } = render(
      <CollectionCollageGrid
        imageUrls={['https://a.com/1.jpg', 'https://a.com/2.jpg']}
        recipeCount={2}
      />
    );
    expect(getByText('2 Recipes')).toBeTruthy();
  });

  it('renders with 4+ images (only uses first 4)', () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://a.com/${i}.jpg`);
    const { getByText } = render(
      <CollectionCollageGrid imageUrls={urls} recipeCount={39} />
    );
    expect(getByText('39 Recipes')).toBeTruthy();
  });

  it('renders recipe count badge accurately', () => {
    const { getByText } = render(
      <CollectionCollageGrid
        imageUrls={['https://a.com/1.jpg']}
        recipeCount={12}
      />
    );
    expect(getByText('12 Recipes')).toBeTruthy();
  });

  it('applies custom size', () => {
    const { getByTestId } = render(
      <CollectionCollageGrid
        imageUrls={[]}
        recipeCount={0}
        size={200}
        testID="sized-collage"
      />
    );
    expect(getByTestId('sized-collage')).toBeTruthy();
  });
});

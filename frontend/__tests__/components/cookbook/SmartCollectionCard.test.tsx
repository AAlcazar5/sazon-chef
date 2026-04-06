// frontend/__tests__/components/cookbook/SmartCollectionCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SmartCollectionCard from '../../../components/cookbook/SmartCollectionCard';

const baseProps = {
  id: 'high_protein',
  name: 'High Protein',
  icon: '💪',
  description: '30g+ protein per serving',
  count: 12,
  onPress: jest.fn(),
};

describe('SmartCollectionCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders name, icon, description, and count', () => {
    const { getByText } = render(<SmartCollectionCard {...baseProps} />);
    expect(getByText('High Protein')).toBeTruthy();
    expect(getByText('💪')).toBeTruthy();
    expect(getByText('30g+ protein per serving')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('recipes')).toBeTruthy();
  });

  it('renders preview images when provided', () => {
    const { getAllByTestId } = render(
      <SmartCollectionCard {...baseProps} previewImages={['https://a.com/1.jpg', 'https://a.com/2.jpg']} />,
    );
    expect(getAllByTestId(/preview-image-/)).toHaveLength(2);
  });

  it('renders no preview strip when previewImages is empty', () => {
    const { queryAllByTestId } = render(<SmartCollectionCard {...baseProps} previewImages={[]} />);
    expect(queryAllByTestId(/preview-image-/)).toHaveLength(0);
  });

  it('renders a "Smart" badge', () => {
    const { getByText } = render(<SmartCollectionCard {...baseProps} />);
    expect(getByText('Smart')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SmartCollectionCard {...baseProps} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('smart-collection-card-high_protein'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows singular "recipe" label when count is 1', () => {
    const { getByText } = render(<SmartCollectionCard {...baseProps} count={1} />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('recipe')).toBeTruthy();
  });

  it('shows plural "recipes" label when count is 0', () => {
    const { getByText } = render(<SmartCollectionCard {...baseProps} count={0} />);
    expect(getByText('0')).toBeTruthy();
    expect(getByText('recipes')).toBeTruthy();
  });

  it('shows plural "recipes" label when count > 1', () => {
    const { getByText } = render(<SmartCollectionCard {...baseProps} count={5} />);
    expect(getByText('5')).toBeTruthy();
    expect(getByText('recipes')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(<SmartCollectionCard {...baseProps} />);
    expect(getByLabelText('High Protein smart collection, 12 recipes')).toBeTruthy();
  });
});

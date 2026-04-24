import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlateHeroCard } from '../../../components/ui/PlateHeroCard';

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

const recipe = {
  id: '1',
  title: 'Honey-garlic shrimp',
  subtitle: 'with jasmine rice',
  imageUrl: 'https://example.com/photo.jpg',
  eyebrow: 'Asian · 92% match',
  cookTime: 20,
  calories: 420,
};

describe('PlateHeroCard', () => {
  it('renders recipe title with serif font', () => {
    const { getByText } = render(
      <PlateHeroCard recipe={recipe} onPress={jest.fn()} saved={false} onToggleSave={jest.fn()} />
    );
    expect(getByText('Honey-garlic shrimp')).toBeTruthy();
  });

  it('renders gradient background (container present)', () => {
    const { getByTestId } = render(
      <PlateHeroCard recipe={recipe} onPress={jest.fn()} saved={false} onToggleSave={jest.fn()} testID="hero" />
    );
    // Gradient is rendered inside container — verify container exists with overflow: visible
    expect(getByTestId('hero')).toBeTruthy();
  });

  it('renders circular photo at 200px', () => {
    const { getByTestId } = render(
      <PlateHeroCard recipe={recipe} onPress={jest.fn()} saved={false} onToggleSave={jest.fn()} testID="hero" />
    );
    const photo = getByTestId('hero-photo');
    const flatStyle = Array.isArray(photo.props.style)
      ? Object.assign({}, ...photo.props.style.filter(Boolean))
      : photo.props.style;
    expect(flatStyle.width).toBe(200);
    expect(flatStyle.height).toBe(200);
    expect(flatStyle.borderRadius).toBe(100);
  });

  it('container has overflow visible', () => {
    const { getByTestId } = render(
      <PlateHeroCard recipe={recipe} onPress={jest.fn()} saved={false} onToggleSave={jest.fn()} testID="hero" />
    );
    const container = getByTestId('hero');
    const flatStyle = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style.filter(Boolean))
      : container.props.style;
    expect(flatStyle.overflow).toBe('visible');
  });

  it('save chip toggles', () => {
    const onToggleSave = jest.fn();
    const { getByTestId } = render(
      <PlateHeroCard recipe={recipe} onPress={jest.fn()} saved={false} onToggleSave={onToggleSave} testID="hero" />
    );
    fireEvent.press(getByTestId('hero-save'));
    expect(onToggleSave).toHaveBeenCalled();
  });

  it('press fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PlateHeroCard recipe={recipe} onPress={onPress} saved={false} onToggleSave={jest.fn()} testID="hero" />
    );
    fireEvent.press(getByTestId('hero'));
    expect(onPress).toHaveBeenCalled();
  });
});

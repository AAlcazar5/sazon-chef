import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditorialCard } from '../../../components/ui/EditorialCard';

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
  imageUrl: 'https://example.com/photo.jpg',
  cookTime: 20,
  calories: 420,
  matchScore: 92,
};

describe('EditorialCard', () => {
  it('renders recipe title', () => {
    const { getByText } = render(
      <EditorialCard recipe={recipe} bg="#FFF3E0" titleColor="#8a4a00" saved={false} onToggleSave={jest.fn()} onPress={jest.fn()} />
    );
    expect(getByText('Honey-garlic shrimp')).toBeTruthy();
  });

  it('renders meta strip with time, cal, and match', () => {
    const { getByText } = render(
      <EditorialCard recipe={recipe} bg="#FFF3E0" titleColor="#8a4a00" saved={false} onToggleSave={jest.fn()} onPress={jest.fn()} />
    );
    expect(getByText(/20/)).toBeTruthy();
    expect(getByText(/420/)).toBeTruthy();
    expect(getByText(/92%/)).toBeTruthy();
  });

  it('heart toggles saved state', () => {
    const onToggleSave = jest.fn();
    const { getByTestId } = render(
      <EditorialCard recipe={recipe} bg="#FFF3E0" titleColor="#8a4a00" saved={false} onToggleSave={onToggleSave} onPress={jest.fn()} />
    );
    fireEvent.press(getByTestId('save-button'));
    expect(onToggleSave).toHaveBeenCalled();
  });

  it('press handler fires', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EditorialCard recipe={recipe} bg="#FFF3E0" titleColor="#8a4a00" saved={false} onToggleSave={jest.fn()} onPress={onPress} testID="card" />
    );
    fireEvent.press(getByTestId('card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(
      <EditorialCard recipe={recipe} bg="#FFF3E0" titleColor="#8a4a00" saved={false} onToggleSave={jest.fn()} onPress={jest.fn()} />
    );
    expect(getByLabelText('Honey-garlic shrimp')).toBeTruthy();
  });
});

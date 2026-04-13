// frontend/__tests__/components/CravingFlowModal.test.tsx
// Tests for the 10G-C "I want to eat X tonight" modal.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }));
jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
    useReducedMotion: () => false,
  };
  return Reanimated;
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockCravingFlow = jest.fn();
jest.mock('../../lib/api', () => ({
  searchApi: {
    cravingFlow: (...args: any[]) => mockCravingFlow(...args),
  },
}));

import CravingFlowModal from '../../components/meal-plan/CravingFlowModal';

const sampleResponse = {
  data: {
    original: {
      name: 'Classic Pepperoni Pizza',
      description: '2 slices',
      calories: 800,
      protein: 35,
      carbs: 90,
      fat: 32,
    },
    healthified: {
      title: 'Cauliflower Crust Pizza',
      description: 'Lighter crust, skim cheese, turkey pepperoni',
      cuisine: 'Italian',
      cookTime: 25,
      servings: 1,
      calories: 380,
      protein: 32,
      carbs: 28,
      fat: 14,
      ingredients: [{ text: 'cauliflower crust', order: 1 }],
      instructions: [{ text: 'bake', step: 1 }],
    },
    honestyNote: "Won't lie — not delivery, but it'll crush the craving at half the calories.",
    lighterSuggestions: [
      { id: 'r1', title: 'Flatbread Caprese', calories: 350, protein: 18, carbs: 35, fat: 12 },
      { id: 'r2', title: 'Naan Pizza', calories: 320, protein: 20, carbs: 32, fat: 10 },
    ],
  },
};

describe('CravingFlowModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCravingFlow.mockResolvedValue(sampleResponse);
  });

  it('renders input step when visible', () => {
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );
    expect(getByTestId('craving-flow-input')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <CravingFlowModal
        visible={false}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );
    expect(queryByTestId('craving-flow-input')).toBeNull();
  });

  it('calls cravingFlow API and shows three option cards on submit', async () => {
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));

    await waitFor(() => {
      expect(mockCravingFlow).toHaveBeenCalledWith('pizza');
    });

    await waitFor(() => {
      expect(getByTestId('craving-flow-option-go-for-it')).toBeTruthy();
      expect(getByTestId('craving-flow-option-healthier')).toBeTruthy();
      expect(getByTestId('craving-flow-option-lighter')).toBeTruthy();
    });
  });

  it('shows original macros and honesty note after submit', async () => {
    const { getByTestId, getByText } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));

    await waitFor(() => {
      expect(getByText(/800/)).toBeTruthy();
      expect(getByText(/crush the craving/i)).toBeTruthy();
    });
  });

  it('does not submit empty craving', async () => {
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('craving-flow-submit'));
    expect(mockCravingFlow).not.toHaveBeenCalled();
  });

  it('fires onGoForIt with original macros', async () => {
    const onGoForIt = jest.fn();
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={onGoForIt}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));
    await waitFor(() => getByTestId('craving-flow-option-go-for-it'));

    fireEvent.press(getByTestId('craving-flow-option-go-for-it'));
    expect(onGoForIt).toHaveBeenCalledWith(expect.objectContaining({ calories: 800 }));
  });

  it('fires onSaveHealthified with healthified recipe', async () => {
    const onSaveHealthified = jest.fn();
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={onSaveHealthified}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));
    await waitFor(() => getByTestId('craving-flow-option-healthier'));

    fireEvent.press(getByTestId('craving-flow-option-healthier'));
    expect(onSaveHealthified).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cauliflower Crust Pizza' }));
  });

  it('fires onBrowseLighter with suggestion list', async () => {
    const onBrowseLighter = jest.fn();
    const { getByTestId } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={onBrowseLighter}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));
    await waitFor(() => getByTestId('craving-flow-option-lighter'));

    fireEvent.press(getByTestId('craving-flow-option-lighter'));
    expect(onBrowseLighter).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'r1' })]),
    );
  });

  it('shows error state when API fails', async () => {
    mockCravingFlow.mockRejectedValueOnce(new Error('AI down'));

    const { getByTestId, getByText } = render(
      <CravingFlowModal
        visible={true}
        onClose={jest.fn()}
        onGoForIt={jest.fn()}
        onSaveHealthified={jest.fn()}
        onBrowseLighter={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('craving-flow-input'), 'pizza');
    fireEvent.press(getByTestId('craving-flow-submit'));

    await waitFor(() => {
      expect(getByText(/couldn't/i)).toBeTruthy();
    });
  });
});

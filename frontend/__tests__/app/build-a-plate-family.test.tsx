// frontend/__tests__/app/build-a-plate-family.test.tsx
// Group 10X Phase 7 — multi-plate family composer screen tests.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockListComponents = jest.fn();
const mockFamily = jest.fn();
jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    list: (...args: any[]) => mockListComponents(...args),
  },
  composedPlateApi: {
    family: (...args: any[]) => mockFamily(...args),
  },
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import BuildAPlateFamilyScreen from '../../app/build-a-plate-family';

beforeEach(() => {
  jest.clearAllMocks();
  mockListComponents.mockResolvedValue({
    data: {
      components: [
        { id: 'p_chicken', name: 'Chicken Thigh', slot: 'protein' },
        { id: 'p_salmon', name: 'Salmon', slot: 'protein' },
        { id: 'b_rice', name: 'Jasmine Rice', slot: 'base' },
        { id: 'v_carrots', name: 'Carrots', slot: 'vegetable' },
        { id: 's_yogurt', name: 'Yogurt Sauce', slot: 'sauce' },
      ],
    },
  });
});

describe('BuildAPlateFamilyScreen (/build-a-plate-family)', () => {
  it('renders the family composer with default 2 plate tabs', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalled());
    expect(screen.getByTestId('family-composer-tab-0')).toBeTruthy();
    expect(screen.getByTestId('family-composer-tab-1')).toBeTruthy();
  });

  it('lets the user pick a protein for the active plate', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    fireEvent.press(screen.getByTestId('family-slot-pick-protein'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-p_chicken'));
    // Slot now displays the picked component
    await waitFor(() =>
      expect(screen.getByTestId('family-slot-pick-protein')).toBeTruthy(),
    );
    expect(screen.queryByText('Chicken Thigh')).toBeTruthy();
  });

  it('switching tabs shows the OTHER plate (independent state)', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    // Pick Chicken on plate 0
    fireEvent.press(screen.getByTestId('family-slot-pick-protein'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-p_chicken'));
    // Switch to plate 1
    fireEvent.press(screen.getByTestId('family-composer-tab-1'));
    // Plate 1 has no protein — slot reads "+ Pick a Protein"
    expect(screen.getByText(/\+ Pick a Protein/i)).toBeTruthy();
  });

  it('Diverge copies plate 0 protein/base onto plate 1 + clears plate 1 vegetable', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    // Plate 0: pick chicken + rice
    fireEvent.press(screen.getByTestId('family-slot-pick-protein'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-p_chicken'));
    fireEvent.press(screen.getByTestId('family-slot-pick-base'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-b_rice'));
    // Plate 1: pick a vegetable that should be cleared by diverge
    fireEvent.press(screen.getByTestId('family-composer-tab-1'));
    fireEvent.press(screen.getByTestId('family-slot-pick-vegetable'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-v_carrots'));
    // Switch back to plate 0 (active) and diverge
    fireEvent.press(screen.getByTestId('family-composer-tab-0'));
    fireEvent.press(screen.getByTestId('family-composer-diverge'));
    // Plate 1 now shows shared chicken + rice; vegetable cleared
    fireEvent.press(screen.getByTestId('family-composer-tab-1'));
    await waitFor(() => expect(screen.queryByText('Chicken Thigh')).toBeTruthy());
    expect(screen.queryByText('Carrots')).toBeNull();
  });

  it('Save calls composedPlateApi.family with persist=true and the right plates', async () => {
    mockFamily.mockResolvedValueOnce({
      data: {
        familyMeal: { userId: 'u1', plates: [], cookSteps: [] },
        persisted: { id: 'fm1', userId: 'u1', name: 'Family meal', cookSteps: [], plateIds: [] },
      },
    });
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    fireEvent.press(screen.getByTestId('family-slot-pick-protein'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-p_chicken'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('family-composer-save'));
    });
    expect(mockFamily).toHaveBeenCalled();
    const arg = mockFamily.mock.calls[0][0];
    expect(arg.persist).toBe(true);
    expect(arg.plates[0].components[0]).toEqual({
      slot: 'protein',
      componentId: 'p_chicken',
      portionMultiplier: 1,
    });
  });

  it('shows the success toast after a persisted save', async () => {
    mockFamily.mockResolvedValueOnce({
      data: {
        familyMeal: { userId: 'u1', plates: [], cookSteps: [] },
        persisted: { id: 'fm1', userId: 'u1', name: null, cookSteps: [], plateIds: [] },
      },
    });
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    fireEvent.press(screen.getByTestId('family-slot-pick-protein'));
    fireEvent.press(screen.getByTestId('family-composer-picker-option-p_chicken'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('family-composer-save'));
    });
    await waitFor(() => expect(screen.getByTestId('family-composer-toast')).toBeTruthy());
  });

  it('Add plate appends a 3rd plate tab; max 6', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    fireEvent.press(screen.getByTestId('family-composer-add-plate'));
    expect(screen.getByTestId('family-composer-tab-2')).toBeTruthy();
  });

  it('Remove plate when more than 1 plate exists', async () => {
    render(<BuildAPlateFamilyScreen />);
    await waitFor(() => expect(mockListComponents).toHaveBeenCalledTimes(5));
    fireEvent.press(screen.getByTestId('family-composer-remove-plate'));
    expect(screen.queryByTestId('family-composer-tab-1')).toBeNull();
  });
});

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditPhysicalProfileScreen from '../../app/edit-physical-profile';
import { userApi } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  userApi: {
    getPhysicalProfile: jest.fn(),
    updatePhysicalProfile: jest.fn()
  }
}));

const mockAlert = jest.fn();

// Helper: render and wait for the screen to finish loading (past the "Loading..." state)
async function renderAndWait() {
  const result = render(<EditPhysicalProfileScreen />);
  await waitFor(() => {
    expect(screen.getByText('Save')).toBeTruthy();
  });
  return result;
}

describe('EditPhysicalProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should render form with default values', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    expect(screen.getByText('Physical Profile')).toBeTruthy();
    expect(screen.getByPlaceholderText('25')).toBeTruthy();
  });

  test('should load existing profile data', async () => {
    const mockProfile = {
      id: 'profile-1',
      gender: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: 'moderately_active',
      fitnessGoal: 'maintain',
      bmr: 1800,
      tdee: 2300
    };

    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: mockProfile });

    await renderAndWait();

    // Age is always displayed directly
    expect(screen.getByDisplayValue('30')).toBeTruthy();
    // Default mode is imperial: 180cm → 5'11", 80kg → 176.4 lbs
    expect(screen.getByDisplayValue('5')).toBeTruthy();
    expect(screen.getByDisplayValue('11')).toBeTruthy();
  });

  test('should validate required fields', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate age range - too young', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '5'); // Too young
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Age must be between 13 and 120');
    });
  });

  test('should validate age range - too old', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '150'); // Too old
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Age must be between 13 and 120');
    });
  });

  test('should validate height range - too short', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '1'); // Too short
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
    });
  });

  test('should validate height range - too tall', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '10'); // Too tall
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
    });
  });

  test('should validate weight range - too light', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('154'), '10'); // Too light
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
    });
  });

  test('should validate weight range - too heavy', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('154'), '800'); // Too heavy
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
    });
  });

  test('should save profile with valid data', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    (userApi.updatePhysicalProfile as jest.Mock).mockResolvedValue({
      data: {
        profile: {
          bmr: 1800,
          tdee: 2300
        }
      }
    });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('10'), '10');
    fireEvent.changeText(screen.getByPlaceholderText('154'), '154');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(userApi.updatePhysicalProfile).toHaveBeenCalledWith({
        gender: 'male',
        age: 30,
        heightCm: 178, // 5'10" converted to cm
        weightKg: 69.9, // 154 lbs converted to kg (rounded to 1 decimal)
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      });
    });
  });

  test('should handle API errors gracefully', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<EditPhysicalProfileScreen />);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Notice', 'Starting with a fresh profile. Fill in your details below.');
    });
  });

  test('should handle save errors', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    (userApi.updatePhysicalProfile as jest.Mock).mockRejectedValue(new Error('Save failed'));

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('10'), '10');
    fireEvent.changeText(screen.getByPlaceholderText('154'), '154');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Save failed');
    });
  });

  test('should toggle between imperial and metric units', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    fireEvent.press(screen.getByText('Switch to cm'));

    expect(screen.getByText('Switch to ft/in')).toBeTruthy();
  });

  test('should display calculated metrics after save', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    (userApi.updatePhysicalProfile as jest.Mock).mockResolvedValue({
      data: {
        profile: {
          bmr: 1800,
          tdee: 2300
        }
      }
    });

    await renderAndWait();

    fireEvent.changeText(screen.getByPlaceholderText('25'), '30');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('10'), '10');
    fireEvent.changeText(screen.getByPlaceholderText('154'), '154');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('1800 cal/day')).toBeTruthy();
      expect(screen.getByText('2300 cal/day')).toBeTruthy();
    });
  });

  test('should handle gender selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    // Just test that pressing Female button doesn't crash
    const femaleButton = screen.getByText('Female');
    fireEvent.press(femaleButton);

    // The button text should still exist after press
    expect(screen.getByText('Female')).toBeTruthy();
  });

  test('should handle activity level selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    // Just test that pressing Very Active doesn't crash
    const veryActiveButton = screen.getByText('Very Active');
    fireEvent.press(veryActiveButton);

    expect(screen.getByText('Very Active')).toBeTruthy();
  });

  test('should handle fitness goal selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });

    await renderAndWait();

    // Just test that pressing Gain Muscle doesn't crash
    const muscleGainButton = screen.getByText('Gain Muscle');
    fireEvent.press(muscleGainButton);

    expect(screen.getByText('Gain Muscle')).toBeTruthy();
  });
});

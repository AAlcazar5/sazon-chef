import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import EditPhysicalProfileScreen from '../../app/edit-physical-profile';
import { userApi } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  userApi: {
    getPhysicalProfile: jest.fn(),
    updatePhysicalProfile: jest.fn()
  }
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: mockAlert
    }
  };
});

describe('EditPhysicalProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
  });

  test('should render form with default values', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Physical Profile')).toBeTruthy();
      expect(screen.getByPlaceholderText('25')).toBeTruthy();
    });
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
    
    render(<EditPhysicalProfileScreen />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeTruthy();
      expect(screen.getByDisplayValue('180')).toBeTruthy();
      expect(screen.getByDisplayValue('80')).toBeTruthy();
    });
  });

  test('should validate required fields', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Please fill in all required fields');
    });
  });

  test('should validate age range - too young', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '5'); // Too young
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Age must be between 13 and 120');
    });
  });

  test('should validate age range - too old', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '150'); // Too old
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Age must be between 13 and 120');
    });
  });

  test('should validate height range - too short', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '25');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '1'); // Too short
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
    });
  });

  test('should validate height range - too tall', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '25');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '10'); // Too tall
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
    });
  });

  test('should validate weight range - too light', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '25');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '5');
    
    const weightInput = screen.getByPlaceholderText('154');
    fireEvent.changeText(weightInput, '10'); // Too light
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
    });
  });

  test('should validate weight range - too heavy', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '25');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '5');
    
    const weightInput = screen.getByPlaceholderText('154');
    fireEvent.changeText(weightInput, '800'); // Too heavy
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
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
    
    render(<EditPhysicalProfileScreen />);
    
    // Fill in valid data
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '30');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '5');
    
    const inchesInput = screen.getByPlaceholderText('10');
    fireEvent.changeText(inchesInput, '10');
    
    const weightInput = screen.getByPlaceholderText('154');
    fireEvent.changeText(weightInput, '154');
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(userApi.updatePhysicalProfile).toHaveBeenCalledWith({
        gender: 'male',
        age: 30,
        heightCm: 178, // 5'10" converted to cm
        weightKg: 70, // 154 lbs converted to kg
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
    
    render(<EditPhysicalProfileScreen />);
    
    // Fill in valid data
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '30');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '5');
    
    const inchesInput = screen.getByPlaceholderText('10');
    fireEvent.changeText(inchesInput, '10');
    
    const weightInput = screen.getByPlaceholderText('154');
    fireEvent.changeText(weightInput, '154');
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Save failed');
    });
  });

  test('should toggle between imperial and metric units', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const toggleButton = screen.getByText('Switch to cm');
    fireEvent.press(toggleButton);
    
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
    
    render(<EditPhysicalProfileScreen />);
    
    // Fill in valid data and save
    const ageInput = screen.getByPlaceholderText('25');
    fireEvent.changeText(ageInput, '30');
    
    const heightInput = screen.getByPlaceholderText('5');
    fireEvent.changeText(heightInput, '5');
    
    const inchesInput = screen.getByPlaceholderText('10');
    fireEvent.changeText(inchesInput, '10');
    
    const weightInput = screen.getByPlaceholderText('154');
    fireEvent.changeText(weightInput, '154');
    
    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('1800 cal/day')).toBeTruthy();
      expect(screen.getByText('2300 cal/day')).toBeTruthy();
    });
  });

  test('should handle gender selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const femaleButton = screen.getByText('Female');
    fireEvent.press(femaleButton);
    
    expect(femaleButton.parent?.props.className).toContain('bg-orange-500');
  });

  test('should handle activity level selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const veryActiveButton = screen.getByText('Very Active');
    fireEvent.press(veryActiveButton);
    
    expect(veryActiveButton.parent?.props.className).toContain('bg-orange-100');
  });

  test('should handle fitness goal selection', async () => {
    (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: null });
    
    render(<EditPhysicalProfileScreen />);
    
    const muscleGainButton = screen.getByText('Gain Muscle');
    fireEvent.press(muscleGainButton);
    
    expect(muscleGainButton.parent?.props.className).toContain('bg-purple-500');
  });
});

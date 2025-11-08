// frontend/__tests__/app/profile.test.tsx
// Tests for profile screen logout functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../app/(tabs)/profile';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { userApi } from '../../lib/api';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

// Create a shared mock router that can be accessed by both useRouter and direct router import
const sharedMockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => sharedMockRouter),
  router: sharedMockRouter,
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately for testing
    const React = require('react');
    React.useEffect(() => {
      if (typeof callback === 'function') {
        callback();
      }
    }, []);
  }),
}));

// Update mockRouter to reference the shared one
const mockRouter = sharedMockRouter;
jest.mock('react', () => {
  const React = jest.requireActual('react');
  return {
    ...React,
    useCallback: (fn: any) => fn,
  };
});
jest.mock('../../lib/api', () => ({
  userApi: {
    getProfile: jest.fn(),
    getNotifications: jest.fn(),
    updateNotifications: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('ProfileScreen - Logout', () => {
  const mockLogout = jest.fn();
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token-123',
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      updateUser: jest.fn(),
    });

    (userApi.getProfile as jest.Mock).mockResolvedValue({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
        },
        preferences: {
          cookTimePreference: 30,
          bannedIngredients: [],
          likedCuisines: [],
          maxRecipeCost: null,
          maxMealCost: null,
          maxDailyFoodBudget: null,
          currency: 'USD',
        },
      },
    });

    (userApi.getNotifications as jest.Mock).mockResolvedValue({
      data: {
        mealReminders: true,
        newRecipes: true,
        goalUpdates: false,
      },
    });

    (Alert.alert as jest.Mock) = jest.fn((title, message, buttons) => {
      // Auto-confirm for testing - call the onPress of the second button (Sign Out)
      if (buttons && Array.isArray(buttons) && buttons[1] && buttons[1].onPress) {
        setTimeout(() => buttons[1].onPress(), 0);
      }
    });
  });

  it('should show logout confirmation dialog', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(userApi.getProfile).toHaveBeenCalled();
    });

    const logoutButton = getByText('Sign Out');
    fireEvent.press(logoutButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });

  it('should logout and redirect to login when confirmed', async () => {
    mockLogout.mockResolvedValue(undefined);

    // Mock Alert.alert to automatically call the confirm button's onPress
    (Alert.alert as jest.Mock) = jest.fn((title, message, buttons) => {
      // Simulate user clicking "Sign Out" button (index 1)
      if (buttons && Array.isArray(buttons) && buttons[1] && buttons[1].onPress) {
        // Call onPress asynchronously to simulate real behavior
        setTimeout(() => {
          buttons[1].onPress();
        }, 0);
      }
    });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(userApi.getProfile).toHaveBeenCalled();
    });

    const logoutButton = getByText('Sign Out');
    fireEvent.press(logoutButton);

    // Wait for Alert to be called
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Wait for logout to be called (after Alert button is pressed)
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Wait for router.replace to be called (after logout completes)
    await waitFor(() => {
      expect(sharedMockRouter.replace).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 });
  });

  it('should not logout when cancelled', async () => {
    (Alert.alert as jest.Mock) = jest.fn((title, message, buttons) => {
      // Simulate cancel - call the onPress of the first button (Cancel) if it exists
      if (buttons && Array.isArray(buttons) && buttons[0] && buttons[0].onPress) {
        setTimeout(() => buttons[0].onPress(), 0);
      }
    });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(userApi.getProfile).toHaveBeenCalled();
    });

    const logoutButton = getByText('Sign Out');
    fireEvent.press(logoutButton);

    expect(mockLogout).not.toHaveBeenCalled();
    expect(sharedMockRouter.replace).not.toHaveBeenCalled();
  });

  it('should handle logout errors', async () => {
    mockLogout.mockRejectedValue(new Error('Logout failed'));

    (Alert.alert as jest.Mock) = jest.fn((title, message, buttons) => {
      if (buttons && buttons[1]) {
        buttons[1].onPress();
      }
    });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(userApi.getProfile).toHaveBeenCalled();
    });

    const logoutButton = getByText('Sign Out');
    fireEvent.press(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    // Should still show error alert
    expect(Alert.alert).toHaveBeenCalled();
  });
});


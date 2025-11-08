// frontend/__tests__/app/login.test.tsx
// Tests for login screen

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../app/login';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('expo-router');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: jest.fn(),
      logout: mockLogout,
      updateUser: jest.fn(),
    });
    (Alert.alert as jest.Mock) = jest.fn();
  });

  it('should render login form', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account?")).toBeTruthy();
  });

  it('should show error for empty fields', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter both email and password');
    });
  });

  it('should show error for invalid email', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('should show error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'short');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 8 characters');
    });
  });

  it('should call login with correct credentials', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('should handle login errors', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('should navigate to register screen', () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Sign Up'));

    expect(mockRouter.push).toHaveBeenCalledWith('/register');
  });

  it('should show loading state during login', async () => {
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    const { getByPlaceholderText, getByText, queryByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    // Button should be disabled during loading
    await waitFor(() => {
      expect(queryByText('Sign In')).toBeNull(); // Button text replaced with loading indicator
    });

    resolveLogin!();
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});


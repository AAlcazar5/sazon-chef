// frontend/__tests__/app/register.test.tsx
// Phase 5: Register screen — confirm password, mismatch error, excited mascot on success

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from '../../app/register';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../contexts/AuthContext');
jest.mock('expo-router');

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  return function MockLogoMascot({ expression }: any) {
    return require('react').createElement(
      require('react-native').View,
      { testID: `mascot-${expression}` },
    );
  };
});

// ── Setup ─────────────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

describe('RegisterScreen', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: mockRegister,
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    (Alert.alert as jest.Mock) = jest.fn();
  });

  // ── Structure ───────────────────────────────────────────────────────────────

  it('renders all registration form fields', () => {
    const { getByPlaceholderText, getAllByText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password (min 8 characters)')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getAllByText('Create Account').length).toBeGreaterThan(0);
  });

  it('renders the Confirm Password field', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it('shows error for empty name', async () => {
    const { getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.press(getByLabelText('Create Account'));
    await waitFor(() => expect(getByText('Name is required')).toBeTruthy());
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByLabelText('Create Account'));
    await waitFor(() =>
      expect(getByText('Please enter a valid email address')).toBeTruthy()
    );
  });

  it('shows error for short password', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'short');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'short');
    fireEvent.press(getByLabelText('Create Account'));
    await waitFor(() =>
      expect(getByText('Password must be at least 8 characters')).toBeTruthy()
    );
  });

  it('shows inline mismatch error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'differentpass');
    fireEvent.press(getByLabelText('Create Account'));
    await waitFor(() => expect(getByText('Passwords do not match')).toBeTruthy());
  });

  it('mismatch error is inline — Alert is NOT called', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'differentpass');
    fireEvent.press(getByLabelText('Create Account'));
    await waitFor(() => expect(getByText('Passwords do not match')).toBeTruthy());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // ── Registration success ────────────────────────────────────────────────────

  it('calls register with correct data', async () => {
    mockRegister.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByLabelText('Create Account'));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123')
    );
  });

  it('shows excited mascot briefly after successful registration', async () => {
    jest.useFakeTimers();
    mockRegister.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByLabelText, queryByTestId } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');

    await act(async () => {
      fireEvent.press(getByLabelText('Create Account'));
      await Promise.resolve(); // flush register() promise
    });

    await waitFor(() => expect(queryByTestId('mascot-excited')).toBeTruthy());

    // After 800ms timeout fires — mascot hides and router navigates
    act(() => { jest.advanceTimersByTime(900); });
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');

    jest.useRealTimers();
  });

  it('routes to /(tabs) after successful registration', async () => {
    jest.useFakeTimers();
    mockRegister.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');

    await act(async () => {
      fireEvent.press(getByLabelText('Create Account'));
      await Promise.resolve();
    });

    act(() => { jest.advanceTimersByTime(900); });
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');

    jest.useRealTimers();
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('shows inline error message on registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('User already exists'));

    const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByLabelText('Create Account'));

    await waitFor(() => expect(getByText('User already exists')).toBeTruthy());
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  it('navigates to login when Sign In is pressed', () => {
    const { getByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Sign In'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  // ── Input trimming ──────────────────────────────────────────────────────────

  it('trims name before calling register', async () => {
    mockRegister.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByLabelText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), '  Test User  ');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password (min 8 characters)'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByLabelText('Create Account'));

    await waitFor(() => expect(mockRegister).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123');
  });
});

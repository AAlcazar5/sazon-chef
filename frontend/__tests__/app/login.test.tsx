// frontend/__tests__/app/login.test.tsx
// Phase 5: Login screen — mascot, gradient, disabled state, friendly errors, routing

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../app/login';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../contexts/AuthContext');
jest.mock('expo-router');

// Forward testID so gradient-background is queryable
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: function MockLinearGradient(props: any) {
    return require('react').createElement(
      require('react-native').View,
      { testID: props.testID, style: props.style },
      props.children || null,
    );
  },
}));

jest.mock('../../components/mascot/LogoMascot', () => {
  return function MockLogoMascot({ expression }: any) {
    return require('react').createElement(
      require('react-native').View,
      { testID: `mascot-${expression}` },
    );
  };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  return function MockHTO(props: any) {
    return require('react').createElement(require('react-native').TouchableOpacity, props);
  };
});

// ── Setup ─────────────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

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
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    (Alert.alert as jest.Mock) = jest.fn();
  });

  // ── Structure ───────────────────────────────────────────────────────────────

  it('renders mascot element', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('login-mascot')).toBeTruthy();
  });

  it('renders gradient background', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('gradient-background')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('renders Sign In button and sign-up link', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account?")).toBeTruthy();
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it('shows error for empty fields', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => expect(getByText('Email is required')).toBeTruthy());
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() =>
      expect(getByText('Please enter a valid email address')).toBeTruthy()
    );
  });

  it('shows error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'short');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() =>
      expect(getByText('Password must be at least 8 characters')).toBeTruthy()
    );
  });

  // ── Disabled state ──────────────────────────────────────────────────────────

  it('"Sign In" button is disabled while login is in-flight', async () => {
    let resolveLogin!: () => void;
    mockLogin.mockReturnValue(new Promise<void>((r) => { resolveLogin = r; }));

    const { getByPlaceholderText, getByText, getByLabelText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      const btn = getByLabelText('Sign In');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    resolveLogin();
  });

  it('"Sign In" button is enabled with valid email and non-empty password', () => {
    const { getByLabelText } = render(<LoginScreen />);
    const btn = getByLabelText('Sign In');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  // ── Friendly errors ─────────────────────────────────────────────────────────

  it('shows friendly error when credentials are wrong (contains "again" or "try")', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      const errorEl = getByText(/again|try/i);
      expect(errorEl).toBeTruthy();
    });
  });

  it('friendly error does not expose raw server phrases', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByText, queryByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => expect(queryByText(/again|try/i)).toBeTruthy());
    // Raw server text should NOT be shown verbatim
    expect(queryByText('Invalid credentials')).toBeNull();
  });

  // ── Success routing ─────────────────────────────────────────────────────────

  it('routes to /(tabs) on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  it('navigates to register screen when Sign Up is pressed', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign Up'));
    expect(mockRouter.push).toHaveBeenCalledWith('/register');
  });
});

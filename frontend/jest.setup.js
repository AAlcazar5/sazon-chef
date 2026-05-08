// frontend/jest.setup.js
// Jest setup file for mocks and global configuration

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouter),
  router: mockRouter,
  useSegments: jest.fn(() => []),
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) })),
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately for testing
    if (typeof callback === 'function') {
      callback();
    }
  }),
  Stack: ({ children }: any) => children,
}));

// Mock expo-image (native module not available in tests)
jest.mock('expo-image', () => ({
  Image: function MockImage() { return null; },
}));

// Mock expo-linear-gradient (native module not available in tests)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: function MockLinearGradient(props) {
    return props.children || null;
  },
}));

// Mock react-native-safe-area-context (displayName required by react-native-css-interop)
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: function MockSafeAreaProvider(props) { return props.children || null; },
  SafeAreaView: function MockSafeAreaView(props) { return props.children || null; },
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 375, height: 812 })),
  withSafeAreaInsets: function(Component) { return Component; },
}));

// Mock expo-auth-session (used by utils/socialAuth.ts at module level)
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'sazon://auth/callback'),
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: jest.fn(),
  })),
  ResponseType: { Token: 'token', Code: 'code' },
  Scope: { EMAIL: 'email', FULL_NAME: 'name' },
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

// Mock expo-web-browser (used by utils/socialAuth.ts at module level)
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock ThemeContext globally (used by Icon and many other components)
jest.mock('./contexts/ThemeContext', () => {
  const React = require('react');
  // Real React context so test utilities can construct a Provider with a fake
  // value; existing test files that consume `useTheme` still get the safe
  // light-mode default below.
  const ThemeContext = React.createContext(undefined);
  return {
    ThemeContext,
    useTheme: jest.fn(() => ({
      theme: 'light',
      isDark: false,
      themeMode: 'light',
      systemColorScheme: 'light',
      colors: {},
      setThemeMode: jest.fn(),
      toggleTheme: jest.fn(),
    })),
    ThemeProvider: function MockThemeProvider(props) { return props.children; },
  };
});

// Mock ProfileAvatarButton globally — it uses BottomSheetModal which
// requires a provider higher in the tree. Render nothing.
jest.mock('./components/profile/ProfileAvatarButton', () => ({
  __esModule: true,
  default: function MockProfileAvatarButton() { return null; },
}));

// Mock AuthContext globally — tests don't need a real AuthProvider in the
// tree just because some component renders a ProfileAvatarButton or other
// auth-aware widget.
jest.mock('./contexts/AuthContext', () => {
  const React = require('react');
  const AuthContext = React.createContext(undefined);
  return {
    AuthContext,
    useAuth: jest.fn(() => ({
      user: { id: 'test-user-id', email: 'test@sazon.local', name: 'Test User' },
      token: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })),
    AuthProvider: function MockAuthProvider(props) { return props.children; },
  };
});

// lottie-react-native + react-native-view-shot mocked via manual
// __mocks__/*.js files. Inline jest.mock factories don't work here:
// nativewind/babel transforms React.createElement(View, …) into a
// CSS-interop wrapper that hoists an out-of-scope helper, which jest
// rejects from inside mock factories.
jest.mock('lottie-react-native');
jest.mock('react-native-view-shot');

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));

// Note: jest-expo already mocks react-native, so we don't need to mock it here
// Alert is mocked in individual test files where needed

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Polyfill window.dispatchEvent for react-test-renderer (React 19 error reporting)
if (typeof window !== 'undefined' && typeof window.dispatchEvent !== 'function') {
  window.dispatchEvent = jest.fn();
}

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
jest.mock('./contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    themeMode: 'light',
    colors: {},
    setThemeMode: jest.fn(),
    toggleTheme: jest.fn(),
  })),
  ThemeProvider: function MockThemeProvider(props) { return props.children; },
}));

// Mock lottie-react-native (native module not available in tests)
jest.mock('lottie-react-native', () => {
  const { forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef(function MockLottieView(props, ref) {
      return View({ testID: 'lottie-view', ...props });
    }),
  };
});

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => {
  const { forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef(function MockViewShot(props, ref) {
      return View({ testID: 'view-shot', ...props });
    }),
  };
});

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

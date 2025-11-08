// frontend/jest.setup.js
// Jest setup file for mocks and global configuration

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
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately for testing
    if (typeof callback === 'function') {
      callback();
    }
  }),
  Stack: ({ children }: any) => children,
}));

// Note: jest-expo already mocks react-native, so we don't need to mock it here
// Alert is mocked in individual test files where needed

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

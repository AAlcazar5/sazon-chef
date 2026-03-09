// frontend/jest.config.js
// Jest configuration for React Native testing

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|moti|@motify)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^moti$': '<rootDir>/__mocks__/moti.js',
    // Redirect nativewind/react-native-css-interop JSX runtime to React's standard runtime
    // This prevents wrap-jsx from crashing in tests when component types are undefined
    '^nativewind/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^nativewind/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
    '^react-native-css-interop/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^react-native-css-interop/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
};

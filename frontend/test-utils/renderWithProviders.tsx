// frontend/__tests__/utils/renderWithProviders.tsx
// ROADMAP 4.0 R12 — Shared test render helper.
//
// Wraps rendered children in the same provider tree the app uses at the root
// (AuthContext + ThemeContext) so individual tests don't have to mock-out
// child components that consume those contexts. Drop-in replacement for
// react-native-testing-library's `render`.

import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { Colors } from '../constants/Colors';

type AuthValue = NonNullable<React.ContextType<typeof AuthContext>>;
type ThemeValue = NonNullable<React.ContextType<typeof ThemeContext>>;

interface ProviderOverrides {
  /** Override the default fake AuthContext value (e.g., simulate logged-out user) */
  auth?: Partial<AuthValue>;
  /** Override the default fake ThemeContext value */
  theme?: Partial<ThemeValue>;
}

const defaultAuthValue: AuthValue = {
  user: { id: 'test-user-id', email: 'test@sazon.local', name: 'Test User' } as never,
  token: 'test-token',
  isLoading: false,
  isAuthenticated: true,
  login: async () => {},
  register: async () => {},
  socialLogin: async () => {},
  logout: async () => {},
  updateUser: async () => {},
};

const defaultThemeValue: ThemeValue = {
  theme: 'light',
  isDark: false,
  themeMode: 'light',
  systemColorScheme: 'light',
  colors: Colors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
};

interface AllProvidersProps {
  children: React.ReactNode;
  overrides?: ProviderOverrides;
}

function AllProviders({ children, overrides }: AllProvidersProps) {
  const authValue: AuthValue = { ...defaultAuthValue, ...(overrides?.auth ?? {}) };
  const themeValue: ThemeValue = { ...defaultThemeValue, ...(overrides?.theme ?? {}) };
  // P5: every test needs a QueryClient so any hook that uses useQuery
  // (transitively through the rendered tree) finds a provider in context.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  providers?: ProviderOverrides;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult {
  const { providers, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => <AllProviders overrides={providers}>{children}</AllProviders>,
    ...renderOptions,
  });
}

// Re-export test-library helpers so callers can replace a single `render` import.
export * from '@testing-library/react-native';

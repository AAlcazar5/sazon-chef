// __tests__/test-utils/render.tsx
//
// P5: drop-in replacement for `@testing-library/react-native`'s `render`
// that wraps every test render in a fresh QueryClientProvider. Any screen
// or component that calls `useQuery` (directly or transitively via a hook
// like useBudget / useCookingJourney / useCoachMemoryCount) needs a client
// in context — without this, RNTL throws "No QueryClient set".
//
// Usage:
//   import { render } from '../test-utils/render';
// (or: '../../test-utils/render' depending on test depth)

import React from 'react';
import {
  render as rnRender,
  type RenderOptions,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

interface RenderWithProvidersResult
  extends ReturnType<typeof rnRender> {
  queryClient: QueryClient;
}

export function render(
  ui: React.ReactElement,
  options?: RenderOptions,
): RenderWithProvidersResult {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const result = rnRender(ui, { wrapper: Wrapper, ...options });
  return Object.assign(result, { queryClient });
}

export * from '@testing-library/react-native';

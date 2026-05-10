// P5: PersistQueryClientProvider must be wired into the root layout so every
// screen can read/write the React Query cache AND so the cache hydrates from
// AsyncStorage on cold start (eliminates the blank-then-populate flash).

import fs from 'fs';
import path from 'path';

const LAYOUT_PATH = path.join(__dirname, '..', '..', 'app', '_layout.tsx');

describe('P5: PersistQueryClientProvider wired into root layout', () => {
  const src = fs.readFileSync(LAYOUT_PATH, 'utf8');

  it('imports PersistQueryClientProvider from @tanstack/react-query-persist-client', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*PersistQueryClientProvider[^}]*\}\s*from\s*['"]@tanstack\/react-query-persist-client['"]/,
    );
  });

  it('imports createQueryClient from lib/queryClient', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*createQueryClient[^}]*\}\s*from\s*['"]\.\.\/lib\/queryClient['"]/,
    );
  });

  it('imports createQueryPersister from lib/queryPersister', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*createQueryPersister[^}]*\}\s*from\s*['"]\.\.\/lib\/queryPersister['"]/,
    );
  });

  it('mounts <PersistQueryClientProvider client={...} persistOptions={...}>', () => {
    expect(src).toMatch(/<PersistQueryClientProvider/);
    expect(src).toMatch(/client=\{[^}]+\}/);
    expect(src).toMatch(/persistOptions=\{[^}]+\}/);
  });

  it('creates the QueryClient at module scope (single instance per app boot)', () => {
    const moduleScopeAssign = /^const\s+\w+\s*=\s*createQueryClient\(\)/m;
    expect(moduleScopeAssign.test(src)).toBe(true);
  });

  it('creates the persister at module scope', () => {
    const moduleScopeAssign = /^const\s+\w+\s*=\s*createQueryPersister\(\)/m;
    expect(moduleScopeAssign.test(src)).toBe(true);
  });
});

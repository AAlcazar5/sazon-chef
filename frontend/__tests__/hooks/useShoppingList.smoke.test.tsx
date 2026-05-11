// U17: useShoppingList contract test.
//
// 1823-line hook orchestrating the shopping-list flagship surface — pre-U17
// had zero dedicated tests. A full render test with all deps mocked hits a
// re-render loop because of the internal effect graph; this contract test
// instead asserts the **public export shape** via static inspection.
// It catches: file failing to compile, accidental removal of the public
// export, signature rename. Deeper happy-path coverage is tracked as
// follow-up work — see ROADMAP_4.0.md Tier U U17.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../hooks/useShoppingList.ts');

describe('U17: useShoppingList contract', () => {
  const src = readFileSync(FILE, 'utf8');

  it('exports useShoppingList as a function', () => {
    expect(src).toMatch(/export\s+function\s+useShoppingList\s*\(/);
  });

  it('exports useActiveList for the active-list selector path', () => {
    expect(src).toMatch(/export\s+function\s+useActiveList\b/);
  });

  it('uses useReducer (state is reducer-driven; bare useState would force a refactor)', () => {
    expect(src).toMatch(/useReducer\s*\(/);
  });

  it('module compiles when imported (catches type / syntax regressions)', () => {
    // CJS require — proves the module parses and exports the hook.
    // Dynamic import() requires --experimental-vm-modules in Jest, which
    // we don't want to opt into for this single test.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../hooks/useShoppingList');
    expect(mod.useShoppingList).toBeDefined();
    expect(typeof mod.useShoppingList).toBe('function');
    expect(mod.useActiveList).toBeDefined();
  });
});

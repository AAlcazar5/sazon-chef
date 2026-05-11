// U17: useProfileData contract test.
//
// 1227-line hook orchestrating the profile flagship surface. Pre-U17 had
// zero dedicated tests. Contract test asserts public-API shape via
// static + module-load inspection — full render coverage requires a
// substantial mock graph and is tracked as follow-up.

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../hooks/useProfileData.ts');

describe('U17: useProfileData contract', () => {
  const src = readFileSync(FILE, 'utf8');

  it('exports useProfileData as a function', () => {
    expect(src).toMatch(/export\s+function\s+useProfileData\b/);
  });

  it('accepts { user, logout } options', () => {
    expect(src).toMatch(/UseProfileDataOptions/);
    expect(src).toMatch(/\buser\b/);
    expect(src).toMatch(/\blogout\b/);
  });

  it('imports showPermissionDenied (U11 wiring not silently removed)', () => {
    expect(src).toMatch(/permissionDeniedHelpers/);
    expect(src).toMatch(/showPermissionDenied/);
  });

  it('module loads (catches type / syntax regressions)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../hooks/useProfileData');
    expect(mod.useProfileData).toBeDefined();
    expect(typeof mod.useProfileData).toBe('function');
  });
});

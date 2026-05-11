// BAP3.1: Build-a-Plate honors `seedFromToday=true` deep-link param.
//
// Contract test: pin the param-reading + autoFit-on-mount behavior at the
// source level. Mounting the full BAP screen requires a heavy mock graph
// (slot picker, modal, header, AI quota, pantry API, composedPlateApi)
// — out of scope for this ratchet. The contract test catches the three
// regression modes spec'd:
//   (a) seedFromToday=true triggers autoFit on mount
//   (b) missing param keeps default seed (no autoFit fires)
//   (c) malformed param falls back gracefully (no crash; treated as false)

import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.resolve(__dirname, '../../app/build-a-plate.tsx');

describe('BAP3.1: build-a-plate seedFromToday contract', () => {
  const src = readFileSync(FILE, 'utf8');

  it('declares seedFromToday in the params union', () => {
    expect(src).toMatch(/seedFromToday\?:\s*string/);
  });

  it('reads seedFromToday via strict equality with the string "true" (malformed → false)', () => {
    // The strict-equality check means 'TRUE', '1', 'yes', '', undefined,
    // null, garbage — all map to false. Graceful fallback by construction.
    expect(src).toMatch(/seedFromToday\s*=\s*params\.seedFromToday\s*===\s*['"]true['"]/);
  });

  it('seedFromToday=true also forces pantryOnly mode (composer in pantry-aware state)', () => {
    expect(src).toMatch(/initialPantryOnly\s*=\s*params\.pantryOnly\s*===\s*['"]true['"]\s*\|\|\s*seedFromToday/);
  });

  // Anchor on the unique seed marker `seedFromTodayFiredRef.current = true`
  // (set the moment the seed effect fires) and capture forward to its
  // closing `, [seedFromToday])`. This avoids cross-effect bleed if a
  // future refactor adds another useEffect above with `seedFromToday`
  // mentioned in passing.
  const seedEffectRe = /seedFromTodayFiredRef\.current\s*=\s*true[\s\S]*?\}\s*,\s*\[seedFromToday\]\s*\)/;

  it('mounts a useEffect that triggers composedPlateApi.autoFit exactly once when seedFromToday is set', () => {
    expect(src).toMatch(/seedFromTodayFiredRef\s*=\s*useRef\(false\)/);
    const seedEffect = src.match(seedEffectRe);
    expect(seedEffect).not.toBeNull();
    expect((seedEffect as RegExpMatchArray)[0]).toMatch(/composedPlateApi\.autoFit/);
    // The ref-guard prevents a re-fire on re-render.
    expect(src).toMatch(/if\s*\(\s*seedFromTodayFiredRef\.current\s*\)\s*return/);
  });

  it('seed failure is silent — no user-facing alert on the seed path', () => {
    // Effect body anchored from the fire-once flag forward must NOT call
    // sazonAlert / Alert.alert / show a toast. Cold-start / empty-pantry
    // users see an empty composer, not an error popup.
    const seedEffect = src.match(seedEffectRe);
    expect(seedEffect).not.toBeNull();
    const effectBody = (seedEffect as RegExpMatchArray)[0];
    expect(effectBody).not.toMatch(/sazonAlert\(/);
    expect(effectBody).not.toMatch(/Alert\.alert\(/);
    expect(effectBody).not.toMatch(/showToast\(/);
  });
});

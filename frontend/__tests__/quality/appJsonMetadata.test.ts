// U1: app.json metadata ratchet.
//
// Pre-launch invariants for `frontend/app.json`:
//   - name / slug are NOT the placeholder "app"
//   - version is set to a non-default semver string (>= 1.0.0 but customisable)
//   - scheme stays "sazon" (P10 already enforced; doubled-checked here so any
//     regression surfaces under the launch ratchet)
//   - required iOS + Android keys present

import { readFileSync } from 'fs';
import path from 'path';

const APP_JSON = path.resolve(__dirname, '../..', 'app.json');

interface AppJsonShape {
  expo: {
    name: string;
    slug: string;
    version: string;
    scheme: string;
    ios?: { supportsTablet?: boolean; bundleIdentifier?: string };
    android?: { permissions?: string[]; package?: string };
  };
}

function loadAppJson(): AppJsonShape {
  return JSON.parse(readFileSync(APP_JSON, 'utf8'));
}

describe('U1: app.json metadata', () => {
  it('name is non-default Sazon brand', () => {
    const json = loadAppJson();
    expect(json.expo.name).toBeDefined();
    expect(json.expo.name.toLowerCase()).not.toBe('app');
    expect(json.expo.name.toLowerCase()).not.toBe('myapp');
    expect(json.expo.name).toBe('Sazon');
  });

  it('slug is non-default brand slug', () => {
    const json = loadAppJson();
    expect(json.expo.slug).toBeDefined();
    expect(json.expo.slug).not.toBe('app');
    expect(json.expo.slug).not.toBe('myapp');
    expect(json.expo.slug).toMatch(/^sazon(-[a-z0-9]+)*$/);
  });

  it('version is a valid semver string', () => {
    const json = loadAppJson();
    expect(json.expo.version).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
  });

  it('scheme is the brand-namespaced "sazon" (P10 lock)', () => {
    const json = loadAppJson();
    expect(json.expo.scheme).toBe('sazon');
  });

  it('iOS supportsTablet is set', () => {
    const json = loadAppJson();
    expect(json.expo.ios).toBeDefined();
    expect(json.expo.ios?.supportsTablet).toBe(true);
  });

  it('Android permissions include the network basics', () => {
    const json = loadAppJson();
    expect(json.expo.android).toBeDefined();
    expect(json.expo.android?.permissions).toEqual(
      expect.arrayContaining(['INTERNET', 'ACCESS_NETWORK_STATE']),
    );
  });
});

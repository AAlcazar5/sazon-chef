// Y-Siri-2 (founder Telegram 2026-05-22) — config-plugin Info.plist
// mutation tests. The withDangerousMod (Swift file copy) is exercised
// by `npx expo prebuild` and verified by hand in Xcode; here we pin the
// Info.plist contract that Siri needs to surface the App Intent.

jest.mock('@expo/config-plugins', () => {
  const captureMods: {
    info?: (cfg: any) => any;
    danger?: (cfg: any) => Promise<any>;
  } = {};
  return {
    withInfoPlist: jest.fn((cfg: any, fn: any) => {
      captureMods.info = fn;
      return cfg;
    }),
    withDangerousMod: jest.fn((cfg: any, [_platform, fn]: [string, any]) => {
      captureMods.danger = fn;
      return cfg;
    }),
    __captureMods: captureMods,
  };
});

import withSazonAppIntents from '../../plugins/withSazonAppIntents';

interface CapturedMods {
  info?: (cfg: any) => any;
  danger?: (cfg: any) => Promise<any>;
}

const captured = jest.requireMock('@expo/config-plugins')
  .__captureMods as CapturedMods;

const blankConfig = () => ({
  modResults: {},
});

beforeEach(() => {
  delete captured.info;
  delete captured.danger;
});

describe('withSazonAppIntents — Info.plist mutation', () => {
  it('registers the App Intent NSUserActivityType', () => {
    withSazonAppIntents({} as any);
    expect(captured.info).toBeDefined();
    const result = captured.info!(blankConfig());
    expect(result.modResults.NSUserActivityTypes).toContain(
      'com.sazon.chef.requestRecipe',
    );
  });

  it('adds NSSiriUsageDescription with Sazon-voice copy', () => {
    withSazonAppIntents({} as any);
    const result = captured.info!(blankConfig());
    expect(result.modResults.NSSiriUsageDescription).toMatch(/sazon/i);
    expect(result.modResults.NSSiriUsageDescription).toMatch(/hey siri/i);
    // Not a robotic copy.
    expect(
      result.modResults.NSSiriUsageDescription.toLowerCase(),
    ).not.toMatch(/error|warning|unauthorized/);
  });

  it('preserves existing NSUserActivityTypes (does not clobber)', () => {
    withSazonAppIntents({} as any);
    const existing = {
      modResults: {
        NSUserActivityTypes: ['com.other.app.someActivity'],
      },
    };
    const result = captured.info!(existing);
    expect(result.modResults.NSUserActivityTypes).toEqual(
      expect.arrayContaining([
        'com.other.app.someActivity',
        'com.sazon.chef.requestRecipe',
      ]),
    );
  });

  it('deduplicates if the activity type was already present', () => {
    withSazonAppIntents({} as any);
    const existing = {
      modResults: {
        NSUserActivityTypes: ['com.sazon.chef.requestRecipe'],
      },
    };
    const result = captured.info!(existing);
    const count = result.modResults.NSUserActivityTypes.filter(
      (t: string) => t === 'com.sazon.chef.requestRecipe',
    ).length;
    expect(count).toBe(1);
  });
});

describe('withSazonAppIntents — Swift file copy (withDangerousMod)', () => {
  it('registers a dangerous mod for the iOS platform', () => {
    withSazonAppIntents({} as any);
    expect(captured.danger).toBeDefined();
  });
});

// Y-Siri-3 (founder Telegram 2026-05-22) — Android App Actions config
// plugin tests. The shortcuts.xml file copy (withDangerousMod) is
// exercised by `npx expo prebuild` and verified by hand in Android
// Studio; here we pin the AndroidManifest <meta-data> mutation
// contract that Google Assistant needs to discover the capability.

jest.mock('@expo/config-plugins', () => {
  const captureMods: {
    manifest?: (cfg: any) => any;
    danger?: (cfg: any) => Promise<any>;
  } = {};
  return {
    withAndroidManifest: jest.fn((cfg: any, fn: any) => {
      captureMods.manifest = fn;
      return cfg;
    }),
    withDangerousMod: jest.fn((cfg: any, [_platform, fn]: [string, any]) => {
      captureMods.danger = fn;
      return cfg;
    }),
    __captureMods: captureMods,
  };
});

import withSazonAppActions from '../../plugins/withSazonAppActions';

interface CapturedMods {
  manifest?: (cfg: any) => any;
  danger?: (cfg: any) => Promise<any>;
}

const captured = jest.requireMock('@expo/config-plugins')
  .__captureMods as CapturedMods;

const blankManifestConfig = (): any => ({
  modResults: {
    manifest: {
      application: [
        {
          activity: [
            {
              $: { 'android:name': '.MainActivity' },
            } as any,
          ],
        },
      ],
    },
  },
});

beforeEach(() => {
  delete captured.manifest;
  delete captured.danger;
});

describe('withSazonAppActions — AndroidManifest mutation', () => {
  it('adds the android.app.shortcuts meta-data to MainActivity', () => {
    withSazonAppActions({} as any);
    expect(captured.manifest).toBeDefined();
    const result = captured.manifest!(blankManifestConfig());
    const activity = result.modResults.manifest.application[0].activity[0];
    expect(activity['meta-data']).toBeDefined();
    expect(activity['meta-data'][0].$).toEqual({
      'android:name': 'android.app.shortcuts',
      'android:resource': '@xml/shortcuts',
    });
  });

  it('matches MainActivity when its name is fully qualified', () => {
    withSazonAppActions({} as any);
    const cfg = blankManifestConfig();
    cfg.modResults.manifest.application[0].activity[0].$ = {
      'android:name': 'com.sazon.chef.MainActivity',
    };
    const result = captured.manifest!(cfg);
    const activity = result.modResults.manifest.application[0].activity[0];
    expect(activity['meta-data']).toBeDefined();
    expect(activity['meta-data'][0].$['android:resource']).toBe(
      '@xml/shortcuts',
    );
  });

  it('does not duplicate the meta-data if it already exists', () => {
    withSazonAppActions({} as any);
    const cfg = blankManifestConfig();
    cfg.modResults.manifest.application[0].activity[0]['meta-data'] = [
      {
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      },
    ];
    const result = captured.manifest!(cfg);
    const metas =
      result.modResults.manifest.application[0].activity[0]['meta-data'];
    expect(metas.length).toBe(1);
  });

  it('preserves existing unrelated <meta-data> entries', () => {
    withSazonAppActions({} as any);
    const cfg = blankManifestConfig();
    cfg.modResults.manifest.application[0].activity[0]['meta-data'] = [
      {
        $: {
          'android:name': 'com.other.meta',
          'android:value': 'preserved',
        },
      },
    ];
    const result = captured.manifest!(cfg);
    const metas =
      result.modResults.manifest.application[0].activity[0]['meta-data'];
    const names = metas.map((m: any) => m.$['android:name']);
    expect(names).toEqual(
      expect.arrayContaining(['com.other.meta', 'android.app.shortcuts']),
    );
  });

  it('is a no-op when MainActivity is missing (defensive)', () => {
    withSazonAppActions({} as any);
    const result = captured.manifest!({
      modResults: { manifest: { application: [{ activity: [] }] } },
    });
    expect(
      result.modResults.manifest.application[0].activity.length,
    ).toBe(0);
  });
});

describe('withSazonAppActions — shortcuts.xml copy', () => {
  it('registers a dangerous mod for the android platform', () => {
    withSazonAppActions({} as any);
    expect(captured.danger).toBeDefined();
  });
});

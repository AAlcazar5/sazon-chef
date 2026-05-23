// Expo Config Plugin — Y-Siri-3 (founder Telegram 2026-05-22).
//
// Registers Sazon's Google Assistant App Actions capability so users
// can say "Hey Google, ask Sazon for a tacos recipe" and have the
// query routed straight into the wedge.
//
// What this plugin does at `npx expo prebuild --platform android`:
//   1. Writes `shortcuts.xml` into `android/app/src/main/res/xml/`.
//      That file declares the `actions.intent.GET_THING` capability
//      bound to the existing `sazon://coach?seedMessage=…` deep link.
//   2. Adds a `<meta-data>` tag inside the MainActivity that points
//      Google Assistant at the shortcuts.xml file.
//
// Usage in app.json:
//   "plugins": [
//     ...,
//     "./plugins/withSazonAppActions"
//   ]
//
// Manual handoff (required to complete Y-Siri-3 end-to-end):
//   - Run `npx expo prebuild --clean --platform android`.
//   - Build + install on a real Android device via EAS Build or
//     `npx expo run:android`.
//   - Use Google Assistant's App Actions test tool to verify the
//     "Get a recipe for X" voice flow routes correctly.
//   - See plugins/SAZON_APP_ACTIONS_HANDOFF.md for the full checklist.

const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const XML_FILE_NAME = 'shortcuts.xml';
const XML_SOURCE_PATH = path.join(__dirname, 'android', XML_FILE_NAME);
const SHORTCUTS_META_NAME = 'android.app.shortcuts';

function withSazonAppActions(config) {
  // 1. Copy shortcuts.xml into the Android res/xml/ folder.
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      if (!fs.existsSync(XML_SOURCE_PATH)) {
        throw new Error(
          `withSazonAppActions: shortcuts.xml not found at ${XML_SOURCE_PATH}`,
        );
      }
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      const dest = path.join(xmlDir, XML_FILE_NAME);
      const source = fs.readFileSync(XML_SOURCE_PATH, 'utf8');
      fs.writeFileSync(dest, source, 'utf8');
      return cfg;
    },
  ]);

  // 2. Add the <meta-data android:name="android.app.shortcuts"
  //    android:resource="@xml/shortcuts" /> entry to MainActivity so
  //    Google Assistant discovers the capability.
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return cfg;
    const activities = application.activity ?? [];
    const main = activities.find((a) => {
      const name = a.$?.['android:name'];
      return (
        name === '.MainActivity' ||
        name === 'com.sazon.chef.MainActivity' ||
        name?.endsWith('MainActivity')
      );
    });
    if (!main) return cfg;
    main['meta-data'] = main['meta-data'] ?? [];
    const exists = main['meta-data'].some(
      (m) => m.$?.['android:name'] === SHORTCUTS_META_NAME,
    );
    if (!exists) {
      main['meta-data'].push({
        $: {
          'android:name': SHORTCUTS_META_NAME,
          'android:resource': '@xml/shortcuts',
        },
      });
    }
    return cfg;
  });

  return config;
}

module.exports = withSazonAppActions;

// Expo Config Plugin — Y-Siri-2 (founder Telegram 2026-05-22).
//
// Registers a Sazon App Intent so iOS Siri can route voice queries
// directly into the app:
//
//   "Hey Siri, ask Sazon for a tacos recipe"
//     → Siri transcribes "tacos recipe"
//     → invokes `RequestRecipeIntent` with query="tacos recipe"
//     → the intent opens sazon://coach?seedMessage=tacos%20recipe
//     → the existing coach seedMessage handler fires the wedge
//
// This plugin:
//   1. Writes `SazonAppIntent.swift` into the iOS prebuild directory.
//   2. Registers the App Intent metadata in Info.plist.
//   3. Adds a privacy-usage description for Siri (NSSiriUsageDescription).
//
// Usage in app.json:
//   "plugins": [
//     "expo-router",
//     ["./plugins/withSazonAppIntents", {}]
//   ]
//
// Requirements:
//   - iOS 16+ (App Intents framework was new in iOS 16)
//   - Expo SDK 50+ with prebuild (the ios/ directory must be generated)
//   - EAS Build (does not work in Expo Go because of the native code)
//
// Manual handoff (required to complete Y-Siri-2):
//   - Run `npx expo prebuild --clean --platform ios` to apply this plugin.
//   - Open the generated ios/ project in Xcode.
//   - Verify SazonAppIntent.swift is added to the main target's
//     "Compile Sources" build phase (Xcode usually auto-adds it).
//   - Test on a real iOS 16+ device (Siri doesn't fire in the
//     simulator): "Hey Siri, ask Sazon for tacos".

const fs = require('fs');
const path = require('path');
const {
  withInfoPlist,
  withDangerousMod,
} = require('@expo/config-plugins');

const SWIFT_FILE_NAME = 'SazonAppIntent.swift';

// The Swift source is co-located with this plugin so it stays in sync
// with the JS-side donate API + URL scheme. Edit one, edit the other.
const SWIFT_SOURCE_PATH = path.join(__dirname, 'ios', SWIFT_FILE_NAME);

function withSazonAppIntents(config) {
  // 1. Copy the Swift source into the iOS project at prebuild time.
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectName =
        cfg.modRequest.projectName ?? cfg.name ?? 'sazon-chef';
      const targetDir = path.join(cfg.modRequest.platformProjectRoot, projectName);
      // Best-effort: if the dir doesn't exist yet, write to platformProjectRoot.
      const destDir = fs.existsSync(targetDir)
        ? targetDir
        : cfg.modRequest.platformProjectRoot;
      const destPath = path.join(destDir, SWIFT_FILE_NAME);
      if (!fs.existsSync(SWIFT_SOURCE_PATH)) {
        throw new Error(
          `withSazonAppIntents: Swift source not found at ${SWIFT_SOURCE_PATH}`,
        );
      }
      const source = fs.readFileSync(SWIFT_SOURCE_PATH, 'utf8');
      fs.writeFileSync(destPath, source, 'utf8');
      return cfg;
    },
  ]);

  // 2. Register the App Intent in Info.plist + the Siri permission string.
  config = withInfoPlist(config, (cfg) => {
    // Y-Siri-2 — App Intents discovery + execution metadata.
    cfg.modResults.NSUserActivityTypes = Array.from(
      new Set([
        ...(cfg.modResults.NSUserActivityTypes || []),
        'com.sazon.chef.requestRecipe',
      ]),
    );
    cfg.modResults.NSSiriUsageDescription =
      "Lets you ask Sazon for a recipe with your voice — \"Hey Siri, ask Sazon for tacos\".";
    return cfg;
  });

  return config;
}

module.exports = withSazonAppIntents;

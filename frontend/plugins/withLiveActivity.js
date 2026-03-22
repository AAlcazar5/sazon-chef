// Expo Config Plugin for Dynamic Island / Live Activity support
// This plugin adds the ActivityKit entitlement and creates the
// Live Activity widget extension at prebuild time.
//
// Usage in app.json/app.config.js:
//   plugins: ["./plugins/withLiveActivity"]
//
// Requirements:
//   - iOS 16.1+
//   - Expo SDK 50+
//   - EAS Build (not Expo Go)

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

function withLiveActivity(config) {
  // Add the "Supports Live Activities" key to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });

  // Add push notification entitlement (required for Live Activity updates)
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['aps-environment'] = 'development';
    return config;
  });

  return config;
}

module.exports = withLiveActivity;

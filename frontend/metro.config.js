// frontend/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Configure NativeWind with explicit Android support
// Note: If you encounter 'typeof' token errors, clear the cache:
// rm -rf node_modules/react-native-css-interop/.cache
// Clear watchman cache if issues persist: watchman watch-del-all
module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: false
});
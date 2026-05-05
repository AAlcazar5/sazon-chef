// frontend/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Prevent Metro from resolving backend files (Node.js server code)
// and the landing/ Next.js sub-app (separate web project, has its own node_modules)
const backendPath = path.resolve(__dirname, '..', 'backend');
const landingPath = path.resolve(__dirname, 'landing');
config.resolver.blockList = [
  new RegExp(backendPath.replace(/[/\\]/g, '[/\\\\]') + '.*'),
  new RegExp(landingPath.replace(/[/\\]/g, '[/\\\\]') + '.*'),
];

// Configure NativeWind with explicit Android support
// Note: If you encounter 'typeof' token errors, clear the cache:
// rm -rf node_modules/react-native-css-interop/.cache
// Clear watchman cache if issues persist: watchman watch-del-all
module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: false
});
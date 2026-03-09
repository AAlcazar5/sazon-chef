// Manual mock for HapticTouchableOpacity — avoids reanimated createAnimatedComponent in tests
const React = require('react');
const { TouchableOpacity } = require('react-native');

module.exports = function MockHapticTouchableOpacity({ children, onPress, style, accessibilityLabel, accessibilityRole, testID, hitSlop, disabled, activeOpacity, onLongPress }) {
  return React.createElement(
    TouchableOpacity,
    { onPress, onLongPress, style, accessibilityLabel, accessibilityRole: accessibilityRole || 'button', testID, hitSlop, disabled, activeOpacity },
    children,
  );
};

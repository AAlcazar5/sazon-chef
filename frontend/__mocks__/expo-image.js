// __mocks__/expo-image.js
// Manual mock for `expo-image`. Forwards testID + a11y props to a host
// View so consumer tests that rely on getByTestId('...') etc. keep working
// after the P2 migration from react-native Image → expo-image.

const React = require('react');
const { View } = require('react-native');

function MockImage(props) {
  const { testID, accessibilityLabel, accessibilityRole, style } = props || {};
  return React.createElement(View, {
    testID,
    accessibilityLabel,
    accessibilityRole,
    style,
  });
}

module.exports = {
  Image: MockImage,
};

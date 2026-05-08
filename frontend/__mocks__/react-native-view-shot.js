// Manual mock for react-native-view-shot. See lottie-react-native mock
// for the rationale (nativewind/babel + jest.mock factory don't mix).
const React = require('react');
const { View } = require('react-native');

const MockViewShot = React.forwardRef(function MockViewShot(props, ref) {
  return React.createElement(View, { testID: 'view-shot', ...props, ref });
});

module.exports = {
  __esModule: true,
  default: MockViewShot,
};

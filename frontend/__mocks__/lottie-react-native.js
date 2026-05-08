// Manual mock for lottie-react-native — passthrough View with testID.
// Lives as a __mocks__ file (not jest.mock factory) because the
// nativewind/babel preset wraps React.createElement(View, …) calls
// inside jest.mock factories with an out-of-scope CSS-interop helper
// that crashes the suite.
const React = require('react');
const { View } = require('react-native');

const MockLottieView = React.forwardRef(function MockLottieView(props, ref) {
  return React.createElement(View, { testID: 'lottie-view', ...props, ref });
});

module.exports = {
  __esModule: true,
  default: MockLottieView,
};

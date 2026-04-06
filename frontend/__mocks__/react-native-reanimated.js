// __mocks__/react-native-reanimated.js
// Manual mock for react-native-reanimated — avoids NativeWind/CSS-interop scope issues

const React = require('react');

const MockScrollView = React.forwardRef(function MockReanimatedScrollView(props, ref) {
  const { ScrollView } = require('react-native');
  return React.createElement(ScrollView, { ...props, ref });
});

const MockView = React.forwardRef(function MockReanimatedView(props, ref) {
  const { View } = require('react-native');
  return React.createElement(View, { ...props, ref });
});

const MockText = React.forwardRef(function MockReanimatedText(props, ref) {
  const { Text } = require('react-native');
  return React.createElement(Text, { ...props, ref });
});

const MockImage = React.forwardRef(function MockReanimatedImage(props, ref) {
  const { Image } = require('react-native');
  return React.createElement(Image, { ...props, ref });
});

function createAnimatedComponent(Component) {
  return React.forwardRef(function AnimatedWrapper(props, ref) {
    return React.createElement(Component, { ...props, ref });
  });
}

// Easing functions used by @gorhom/bottom-sheet and others
const Easing = {
  linear: jest.fn((v) => v),
  ease: jest.fn((v) => v),
  quad: jest.fn((v) => v),
  cubic: jest.fn((v) => v),
  poly: jest.fn(() => jest.fn((v) => v)),
  sin: jest.fn((v) => v),
  circle: jest.fn((v) => v),
  exp: jest.fn((v) => v),
  elastic: jest.fn(() => jest.fn((v) => v)),
  back: jest.fn(() => jest.fn((v) => v)),
  bounce: jest.fn((v) => v),
  bezier: jest.fn(() => jest.fn((v) => v)),
  bezierFn: jest.fn(() => jest.fn((v) => v)),
  in: jest.fn((fn) => fn),
  out: jest.fn((fn) => fn),
  inOut: jest.fn((fn) => fn),
};

const noop = jest.fn();

module.exports = {
  __esModule: true,
  default: {
    ScrollView: MockScrollView,
    View: MockView,
    Text: MockText,
    Image: MockImage,
    createAnimatedComponent,
    addWhitelistedNativeProps: noop,
    addWhitelistedUIProps: noop,
  },
  createAnimatedComponent,

  // Hooks
  useSharedValue: jest.fn((init) => ({ value: init })),
  useAnimatedScrollHandler: jest.fn(() => noop),
  useAnimatedStyle: jest.fn(() => ({})),
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  useAnimatedRef: jest.fn(() => ({ current: null })),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  useAnimatedProps: jest.fn(() => ({})),
  useAnimatedReaction: noop,
  useEvent: jest.fn(() => ({})),
  useHandler: jest.fn(() => ({})),
  useWorkletCallback: jest.fn((fn) => fn),
  useReducedMotion: jest.fn(() => false),

  // Animations
  withSpring: jest.fn((val) => val),
  withTiming: jest.fn((val) => val),
  withDelay: jest.fn((_, val) => val),
  withSequence: jest.fn((...vals) => vals[0]),
  withRepeat: jest.fn((val) => val),
  withDecay: jest.fn((val) => val),
  cancelAnimation: noop,
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),

  // Math
  interpolate: jest.fn(() => 0),
  interpolateColor: jest.fn(() => 'transparent'),
  clamp: jest.fn((val) => val),

  // Constants
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing,

  // Layout animations
  FadeIn: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
  FadeOut: { duration: jest.fn(() => ({})) },
  FadeInDown: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
  FadeInUp: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
  SlideInRight: { duration: jest.fn(() => ({})) },
  SlideOutRight: { duration: jest.fn(() => ({})) },
  Layout: { springify: jest.fn(() => ({})), duration: jest.fn(() => ({})) },
  LinearTransition: { springify: jest.fn(() => ({})) },
  ZoomIn: { duration: jest.fn(() => ({})) },
  ZoomOut: { duration: jest.fn(() => ({})) },

  // Animated components
  AnimatedScrollView: MockScrollView,
  AnimatedView: MockView,

  // Keyboard
  useAnimatedKeyboard: jest.fn(() => ({ height: { value: 0 }, state: { value: 0 } })),

  // Sensor
  useAnimatedSensor: jest.fn(() => ({ sensor: { value: {} } })),

  // Misc
  measure: jest.fn(() => null),
  scrollTo: noop,
  setGestureState: noop,
  makeMutable: jest.fn((init) => ({ value: init })),
  makeShareableCloneRecursive: jest.fn((val) => val),
};

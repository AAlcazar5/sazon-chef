// Manual mock for moti — passthrough components for test environment
const React = require('react');
const { View, Text } = require('react-native');

module.exports = {
  MotiView: function MotiView({ children, style }) {
    return React.createElement(View, { style }, children);
  },
  MotiText: function MotiText({ children, style }) {
    return React.createElement(Text, { style }, children);
  },
  MotiImage: function MotiImage({ children, style }) {
    return React.createElement(View, { style }, children);
  },
  useAnimationState: function () {
    return { transitionTo: function () {}, current: 'idle' };
  },
  useMotify: function () {
    return {};
  },
};

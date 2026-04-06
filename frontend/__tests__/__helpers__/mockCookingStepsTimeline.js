const React = require('react');
const { View, Text } = require('react-native');

module.exports = function MockCookingStepsTimeline(props) {
  return React.createElement(View, { testID: props.testID || 'cooking-steps-timeline' },
    (props.steps || []).map((step, i) =>
      React.createElement(Text, { key: i }, step)
    )
  );
};

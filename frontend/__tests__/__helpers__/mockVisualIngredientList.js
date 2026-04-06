const React = require('react');
const { View, Text } = require('react-native');

module.exports = function MockVisualIngredientList(props) {
  return React.createElement(View, { testID: 'visual-ingredient-list' },
    (props.ingredients || []).map((ing, i) => {
      const text = typeof ing === 'string' ? ing : (ing && ing.text) || '';
      return React.createElement(Text, { key: i }, text);
    })
  );
};

const path = require('path');

module.exports = {
  // ... other config
  settings: {
    'import/resolver': {
      typescript: {
        project: path.resolve(__dirname, 'tsconfig.json'), // Point to your tsconfig
      },
      alias: {
        map: [
          ['@', path.resolve(__dirname, './')], // Map '@' to root
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
};
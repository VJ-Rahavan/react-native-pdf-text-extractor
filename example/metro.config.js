const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
module.exports = withMetroConfig(getDefaultConfig(__dirname), {
  root: path.resolve(__dirname, '..'),
  dirname: __dirname,
});

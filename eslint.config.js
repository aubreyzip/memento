// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Phase 0 experiments are isolated validation code with their own dependencies.
  globalIgnores(['dist/*', 'experiments/*']),
  expoConfig,
]);

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  // Phase 0 experiments are isolated validation code with their own dependencies.
  globalIgnores(['dist/*', 'experiments/*']),
  expoConfig,
  // Last: turns off ESLint rules that conflict with Prettier; formatting is checked by Prettier.
  prettierConfig,
]);

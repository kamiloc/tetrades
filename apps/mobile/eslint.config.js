import config from '@packages/eslint-config/react-native';

/** @type {import('eslint').Linter.Config[]} */
export default [{ ignores: ['.expo/**'] }, ...config];

import config from '@packages/eslint-config/nextjs';

/** @type {import('eslint').Linter.Config[]} */
export default [{ ignores: ['.next/**'] }, ...config];

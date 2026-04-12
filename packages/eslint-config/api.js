import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default base.map((config) => {
  if (config.rules?.['no-restricted-imports']) {
    const rule = config.rules['no-restricted-imports'];
    const [severity, options] =
      /** @type {[string, {patterns: Array<{group: string[], message: string}>}]} */ (rule);
    return {
      ...config,
      rules: {
        ...config.rules,
        'no-restricted-imports': [
          severity,
          {
            patterns: [
              ...options.patterns.filter(
                (p) => !p.group.some((g) => g === 'next' || g.startsWith('next/')),
              ),
              {
                group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
                message:
                  'React imports are forbidden in apps/api. The API is a pure Node.js server.',
              },
            ],
          },
        ],
      },
    };
  }
  return config;
});

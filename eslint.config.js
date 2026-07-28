import globals from 'globals';

// Minimal, honest gate: catches real breakage (undefined variables, duplicate
// keys, unreachable code) without style noise on the existing codebase.
export default [
  {
    files: ['src/**/*.{js,jsx}', 'e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-redeclare': 'error',
      'valid-typeof': 'error',
      'no-unsafe-negation': 'error',
    },
  },
];

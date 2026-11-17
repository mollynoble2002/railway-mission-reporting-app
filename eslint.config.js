import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Report content must never reach the browser console. All logging goes through src/lib/log.ts.
      'no-console': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      // Stylistic: arrow-shorthand event handlers that call void functions are idiomatic React.
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // Browser capability checks (navigator.storage, Web Locks) are deliberately defensive
      // because older browsers and some iOS versions lack them.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is not permitted (XSS risk for report content).',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'playwright.config.ts', 'vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'playwright.config.ts', 'vite.config.ts', 'eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);

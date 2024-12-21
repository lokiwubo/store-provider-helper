import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
    },
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // 你可以根据需要配置规则
      'import/named': 'error',
      'import/namespace': 'off',
      'import/default': 'error',
      'import/export': 'error',
    },
  },
];

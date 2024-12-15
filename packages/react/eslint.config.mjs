import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tsEslint from "typescript-eslint";
import reactEslintHooks from "eslint-plugin-react-hooks";
import reactEslint from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tsEslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  reactEslintHooks.configs.recommended,
  reactEslint.configs.recommended,
  ];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略配置
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'web-build/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '*.log',
      'eslint.config.*',
      'metro.config.js',
    ],
  },

  // JS 基础规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Frontend (React Native) 配置
  {
    files: ['frontend/**/*.{js,jsx,ts,tsx}'],
    ...eslintPluginReact.configs.flat.recommended,
    ...eslintPluginReact.configs.flat['jsx-runtime'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      prettier: prettierPlugin,
      'unused-imports': eslintPluginUnusedImports,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
        ErrorUtils: false,
        FormData: false,
        XMLHttpRequest: false,
        alert: false,
        cancelAnimationFrame: false,
        cancelIdleCallback: false,
        clearImmediate: false,
        fetch: false,
        navigator: false,
        process: false,
        requestAnimationFrame: false,
        requestIdleCallback: false,
        setImmediate: false,
        window: false,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Prettier 集成
      'prettier/prettier': 'error',

      // React Hooks 规则
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React 规则调整
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',

      // TypeScript 规则调整
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // 通用规则
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      eqeqeq: ['warn', 'smart'],
    },
  },

  // Backend (Node.js) 配置
  {
    files: ['server/**/*.{js,ts}'],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Prettier 集成
      'prettier/prettier': 'error',

      // TypeScript 规则调整
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // 通用规则
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      eqeqeq: ['warn', 'smart'],
    },
  },

  // Prettier 配置（禁用与 Prettier 冲突的规则）
  prettierConfig,
);

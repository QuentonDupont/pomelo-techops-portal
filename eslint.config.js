// ESLint v9 flat config — required because package.json has "type": "module"
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        DOMParser: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '18' },
    },
    rules: {
      // React
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',            // no PropTypes in this project
      'react/react-in-jsx-scope': 'off',    // React 17+ JSX transform

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',                  // intentional console usage in server
      'no-undef': 'error',
    },
  },
  {
    // Server-side Node files get Node globals
    files: ['server/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __filename: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // Config and script files at root
    files: ['vite.config.js', 'playwright.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];

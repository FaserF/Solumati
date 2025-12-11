import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        settings: { react: { version: '18.3' } },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
            'no-unused-vars': 'warn',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true, allowExportNames: ['useTheme', 'useConfig', 'useI18n', 'useAuth'] },
            ],
        },
    },
    {
        files: ['vite.config.js', 'eslint.config.js', 'playwright.config.js'],
        languageOptions: {
            globals: globals.node,
        },
    },
    {
        files: ['**/*.test.{js,jsx}', 'src/tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
                vi: 'readonly',
            }
        },
    },
]

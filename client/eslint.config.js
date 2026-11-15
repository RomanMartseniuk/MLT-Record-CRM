import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Only the API layer itself may touch the simulated server. Everything
    // else must go through the public contract in '@/api'.
    files: ['src/**/*.{ts,tsx}'],
    // `store/db-store.tsx` is the legacy store: it reads the mock storage
    // directly until the last page is migrated, then it is deleted.
    ignores: ['src/api/**', 'src/store/db-store.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api/mock', '@/api/mock/*', '@/api/mock/**'],
              message: "Import from '@/api' only: the mock server is replaceable.",
            },
          ],
        },
      ],
    },
  },
])

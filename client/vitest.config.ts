import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests cover only pure logic (the mock server engine), so the plain
// node environment is enough: no DOM and no React are involved.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})

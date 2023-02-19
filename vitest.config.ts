import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    testTimeout: 100,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})

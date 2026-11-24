/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// DEV-04 About: versi, commit, tanggal build.
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
let commit = 'dev'
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {
  // Belum ada commit / bukan repo git.
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_SHA__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    // `npm test` hanya src/; tests/rules & tests/integration butuh Emulator (npm run test:rules / test:integration). Default node (crypto.subtle asli); test UI memakai docblock `@vitest-environment jsdom`.
    include: ['src/**/*.test.{ts,tsx}', 'tests/{rules,integration}/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx & firebase.ts hanya bootstrap/config.
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/data/firebase.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
})

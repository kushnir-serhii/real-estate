import { defineConfig, devices } from '@playwright/test'

const PORT = 3199

// UI check at the end of a spec (docs/process.md → step 8).
// Usage: SPEC=001 ROUTES=root,design pnpm ui-check. Screenshots land in e2e/screenshots/ (git-ignored).
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.output',
  reporter: [['list']],
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT}` },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

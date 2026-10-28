import { expect, test } from '@playwright/test'

// Usage (from the repo root): SPEC=001 ROUTES=root,design pnpm ui-check
// Routes go without the leading slash (Git Bash rewrites "/x" into a Windows path); "root" is "/".
// Without ROUTES the default list below is checked. Screenshots: e2e/screenshots/<SPEC>/<route>-<viewport>-<theme>.png

const DEFAULT_ROUTES = ['/', '/design']

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

const THEMES = ['light', 'dark'] as const

const SPEC = process.env.SPEC ?? 'adhoc'
const ROUTES = process.env.ROUTES
  ? process.env.ROUTES.split(',')
      .map((route) => route.trim().replace(/^\/+/, ''))
      .filter(Boolean)
      .map((route) => (route === 'root' ? '/' : `/${route}`))
  : DEFAULT_ROUTES

const fileName = (route: string) => route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'root'

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${route} · ${viewport.name} · ${theme}`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text())
        })

        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript((value) => {
          try {
            localStorage.setItem('lyndrik-theme', value)
          } catch {
            // storage blocked: the page falls back to the system theme
          }
        }, theme)

        await page.goto(route)
        await page.waitForLoadState('networkidle')

        await page.screenshot({
          path: `e2e/screenshots/${SPEC}/${fileName(route)}-${viewport.name}-${theme}.png`,
          fullPage: true,
        })

        expect(errors, 'console or page errors').toEqual([])
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, 'horizontal scroll (px)').toBeLessThanOrEqual(0)
      })
    }
  }
}

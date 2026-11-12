import { expect, test } from '@playwright/test'

// Spec 013: public pages show their real content with JavaScript disabled.
// Runs in `pnpm ui-check` (demo slugs). Screenshots: e2e/screenshots/no-js/<route>-<viewport>.png

test.use({ javaScriptEnabled: false })

const PUBLISHED = '/catalog/2-kimnatna-kvartyra-na-oboloni-3f9a1c'
const BLOG_POST = '/blog/yaki-dokumenty-pereviryty-pered-kupivleiu-kvartyry'
const SOLD ='/catalog/ofis-na-oboloni-biznes-tsentr-2c49e5'

type Case = { route: string; status?: number; key: (page: import('@playwright/test').Page) => import('@playwright/test').Locator }

const CASES: Case[] = [
  { route: '/', key: (p) => p.locator('main article').first() },
  { route: '/catalog', key: (p) => p.locator('main ul article').first() },
  { route: '/catalog?deal=sale&page=2', key: (p) => p.locator('main ul article').first() },
  { route: PUBLISHED, key: (p) => p.getByText(/\d\s?(грн|₴|\$|€|USD|UAH)/).filter({ visible: true }).first() },
  { route: SOLD, key: (p) => p.locator('main').getByText(/продан|орендовано|здано/i).first() },
  { route: '/blog', key: (p) => p.locator('main ul article').first() },
  { route: '/blog?category=buyers', key: (p) => p.locator('main ul article').first() },
  { route: '/blog?page=2', key: (p) => p.locator('main ul article').first() },
  { route: BLOG_POST, key: (p) => p.locator('main article').first() },
  { route: '/about', key: (p) => p.locator('main p').first() },
  { route: '/contacts', key: (p) => p.locator('main').getByText(/Наша команда|Команда/).first() },
  { route: '/favorites', key: (p) => p.locator('main p, main a').first() },
  { route: '/privacy', key: (p) => p.locator('main p').first() },
  { route: '/no-such-page', status: 404, key: (p) => p.getByRole('link').first() },
]

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

for (const { route, status, key } of CASES) {
  for (const viewport of VIEWPORTS) {
    test(`no-js ${route} · ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      const response = await page.goto(route)
      expect(response?.status()).toBe(status ?? 200)

      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await expect(key(page)).toBeVisible()
      // nothing of the loading state may be left behind
      await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0)

      const name = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'root'
      await page.screenshot({ path: `e2e/screenshots/no-js/${name}-${viewport.name}.png`, fullPage: true })
    })
  }
}

// Spec 014: the team on «Про нас» is server-rendered
test('no-js about shows the team', async ({ page }) => {
  await page.goto('/about')
  const team = page.getByRole('region', { name: 'Наша команда' })
  await expect(team.getByRole('heading', { level: 3 }).first()).toBeVisible()
  await expect(team.locator('a[href^="tel:"]').first()).toBeVisible()
})

// Spec 014: styled selects fall back to native ones (noscript) and still submit the same params.
test('no-js quick search submits native selects', async ({ page }) => {
  await page.goto('/')
  const form = page.getByRole('form', { name: 'Швидкий пошук' })
  await form.locator('select[name="property_type"]').selectOption('flat')
  await form.locator('select[name="rooms"]').selectOption('2')
  await form.getByRole('button', { name: 'Знайти' }).click()
  await expect(page).toHaveURL(/\/catalog\?.*property_type=flat/)
  await expect(page).toHaveURL(/rooms=2/)
})

test('no-js catalog sort submits the native select', async ({ page }) => {
  await page.goto('/catalog')
  await page.locator('select[name="sort"]').selectOption('price_asc')
  await page.getByRole('button', { name: 'Застосувати' }).click()
  await expect(page).toHaveURL(/sort=price_asc/)
})

// Spec 015: the blog filter and pagination are plain links.
test('no-js blog category chip and page 2 link navigate', async ({ page }) => {
  await page.goto('/blog')
  await page.getByRole('navigation', { name: 'Категорії статей' }).getByRole('link', { name: 'Покупцям' }).click()
  await expect(page).toHaveURL(/\/blog\?category=buyers/)
  await page.goto('/blog')
  await page.getByRole('link', { name: 'Наступна сторінка' }).click()
  await expect(page).toHaveURL(/\/blog\?page=2/)
  await expect(page.locator('main ul article').first()).toBeVisible()
})

test('blog unknown category shows all posts, draft slug is 404', async ({ page }) => {
  const all = await page.goto('/blog?category=nope')
  expect(all?.status()).toBe(200)
  await expect(page.locator('main ul article')).toHaveCount(6)
  const draft = await page.goto('/blog/5-pomylok-pry-oformlenni-orendy-chernetka')
  expect(draft?.status()).toBe(404)
})

// Spec 015: the «Останні статті» block on home is server-rendered
test('no-js home shows the latest blog posts', async ({ page }) => {
  await page.goto('/')
  const block = page.getByRole('region', { name: 'Останні статті' })
  await expect(block.locator('article')).toHaveCount(3)
  await expect(block.getByRole('link', { name: 'Усі статті' })).toBeVisible()
})

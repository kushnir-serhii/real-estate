// Speed baseline (spec 011 slice 6): `pnpm perf`.
// Needs a production build (`pnpm build`). Uses PERF_URL if set (a running `next start`),
// otherwise spawns `next start` on PERF_PORT (default 3198) with DATA_DRIVER=demo.
// Mobile emulation: 375px viewport, 4x CPU throttle, ~fast 4G. Prints the median of RUNS warm loads.
import { spawn, type ChildProcess } from 'node:child_process'
import { chromium } from '@playwright/test'

const ROUTES = ['/', '/catalog', '/catalog/pentkhaus-z-terasoiu-holosiiv-7d02ef']
const RUNS = Number(process.env.PERF_RUNS ?? 3)
const PORT = Number(process.env.PERF_PORT ?? 3198)
const BASE = process.env.PERF_URL ?? `http://localhost:${PORT}`
const LCP_BUDGET_MS = 2500
const CLS_BUDGET = 0.1

type Sample = { transferred: number; js: number; firstLoadJs: number; requests: number; lcp: number; cls: number }

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const waitForServer = async (url: string) => {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`server did not start at ${url}`)
}

const measure = async (browser: import('@playwright/test').Browser, path: string): Promise<Sample & { external: string[] }> => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (3 * 1024 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const reqs = new Map<string, { url: string; type: string }>()
  const external: string[] = []
  let transferred = 0
  let js = 0
  let firstLoadJs = 0
  let loaded = false
  cdp.on('Network.requestWillBeSent', (e: { requestId: string; type?: string; request: { url: string } }) => {
    const { url } = e.request
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (new URL(url).hostname !== 'localhost') external.push(url)
    reqs.set(e.requestId, { url, type: e.type ?? '' })
  })
  cdp.on('Network.loadingFinished', (e: { requestId: string; encodedDataLength: number }) => {
    const r = reqs.get(e.requestId)
    if (!r) return
    transferred += e.encodedDataLength
    if (r.type === 'Script') {
      js += e.encodedDataLength
      if (!loaded) firstLoadJs += e.encodedDataLength
    }
  })
  page.on('load', () => {
    loaded = true
  })

  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __cls: number }
    w.__lcp = 0
    w.__cls = 0
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__lcp = e.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
        if (!e.hadRecentInput) w.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })

  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  // let late shifts / LCP settle, then scroll is deliberately not done (first-screen metrics)
  await page.waitForTimeout(1000)
  const { lcp, cls } = await page.evaluate(() => {
    const w = window as unknown as { __lcp: number; __cls: number }
    return { lcp: w.__lcp, cls: w.__cls }
  })
  await context.close()
  return { transferred, js, firstLoadJs, requests: reqs.size, lcp, cls, external }
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`

const main = async () => {
  let server: ChildProcess | undefined
  if (!process.env.PERF_URL) {
    server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
      shell: true,
      stdio: 'ignore',
      env: { ...process.env, DATA_DRIVER: 'demo', SEO_ALLOW_LOCALHOST: '1' },
    })
  }
  try {
    await waitForServer(BASE)
    const browser = await chromium.launch()
    const rows: string[][] = []
    let failed = false
    const external: string[] = []
    for (const path of ROUTES) {
      await measure(browser, path) // cold run, excluded
      const runs: Sample[] = []
      for (let i = 0; i < RUNS; i++) {
        const s = await measure(browser, path)
        external.push(...s.external)
        runs.push(s)
      }
      const m = (k: keyof Sample) => median(runs.map((r) => r[k]))
      const ok = m('lcp') < LCP_BUDGET_MS && m('cls') < CLS_BUDGET
      if (!ok) failed = true
      rows.push([
        path.length > 28 ? path.slice(0, 25) + '...' : path,
        kb(m('transferred')),
        kb(m('js')),
        kb(m('firstLoadJs')),
        String(m('requests')),
        `${Math.round(m('lcp'))} ms`,
        m('cls').toFixed(3),
        ok ? 'ok' : 'OVER',
      ])
    }
    await browser.close()
    const head = ['route', 'transferred', 'JS', 'first-load JS', 'requests', 'LCP', 'CLS', 'budget']
    const all = [head, ...rows]
    const w = head.map((_, i) => Math.max(...all.map((r) => r[i].length)))
    for (const r of all) console.log(r.map((c, i) => c.padEnd(w[i])).join('  '))
    if (external.length) {
      console.error('\nNon-localhost requests:\n' + [...new Set(external)].join('\n'))
      process.exitCode = 1
    }
    if (failed) process.exitCode = 1
  } finally {
    if (server?.pid) spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' })
  }
}

void main()

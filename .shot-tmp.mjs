import { chromium } from "playwright";
// usage: node .shot-tmp.mjs <outDir> <prefix> <path> [dark]
const [out, prefix, rawPath = "root", theme] = process.argv.slice(2);
const path = rawPath === "root" ? "/" : `/${rawPath}`;
const b = await chromium.launch();
for (const [name, w, h] of [
  ["desk", 1440, 900],
  ["mob", 390, 844],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  await p.goto(`http://localhost:${process.env.PORT ?? 3000}${path}`, { waitUntil: "networkidle", timeout: 120000 });
  if (theme === "dark") await p.evaluate(() => document.documentElement.classList.add("dark"));
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${prefix}-${name}-fold.png` });
  await p.screenshot({ path: `${out}/${prefix}-${name}.png`, fullPage: true });
}
await b.close();

// Generates the raster brand assets from the mark: src/app/favicon.ico and public/og-default.png.
// Run after changing the brand: `node scripts/generate-brand-assets.mjs` (uses sharp, no network).
// BRAND_* colours below mirror --ink, --on-ink and --dawn in src/app/globals.css (light): keep them in sync.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const NAME = "7 SKY";
const TAGLINE = "Агентство нерухомості в Києві";
const SUBLINE = "Купівля, продаж та оренда квартир і будинків";
const BRAND_BG = "#0d1b2e"; // midnight (--ink)
const BRAND_FG = "#f6f4ef"; // off-white (--on-ink)
const BRAND_ACCENT = "#e8a15c"; // dawn (--dawn)

const icon = readFileSync("src/app/icon.svg");

// favicon.ico: PNG-compressed 16 / 32 / 48 px images.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(icon, { density: 72 * (s / 64) * 4 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0);
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

// og-default.png: 1200x630, mark + wordmark + tagline on the brand colour.
const mark = `
  <g transform="translate(96 84) scale(3.2) translate(-4 -6)" fill="none" stroke="${BRAND_ACCENT}" stroke-width="4" stroke-linejoin="miter" stroke-linecap="butt">
    <path d="M40 68H24A15.5 15.5 0 0 1 26 38A30 30 0 0 1 84 30A20.5 20.5 0 0 1 96 68H76"/>
    <path d="M40 70V54L48 50"/>
    <path d="M48 70V30L66 20V44"/>
    <path d="M58 70V40L76 49V70"/>
    <path d="M53 70V33M64 70V43M70 70V46"/>
  </g>`;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BRAND_BG}"/>
  ${mark}
  <text x="96" y="430" font-family="'Sofia Sans', 'Segoe UI', Arial, sans-serif" font-size="120" font-weight="800" fill="${BRAND_FG}">${NAME}</text>
  <text x="96" y="502" font-family="'Sofia Sans', 'Segoe UI', Arial, sans-serif" font-size="42" font-weight="600" fill="${BRAND_FG}">${TAGLINE}</text>
  <text x="96" y="558" font-family="'Sofia Sans', 'Segoe UI', Arial, sans-serif" font-size="30" fill="${BRAND_FG}" fill-opacity="0.9">${SUBLINE}</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og-default.png");
console.log("favicon.ico and og-default.png written");

// Generates the brand assets from the shield: src/app/icon.svg, src/app/favicon.ico and public/og-default.png.
// Run after changing the brand: `node scripts/generate-brand-assets.mjs` (uses sharp, no network).
// The shield paths mirror public/brand/diplomat-hall-shield.svg and src/components/layout/shield-mark.tsx: keep them in sync.
// Monochrome like the logo: midnight (--ink / light --foreground) on off-white (--on-ink / light --background) from
// src/app/globals.css: keep the colours in sync.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const TAGLINE = "Агентство нерухомості в Києві";
const SUBLINE = "Купівля, продаж та оренда квартир і будинків";
const BRAND_INK = "#0d1b2e"; // midnight (--ink)
const BRAND_PAPER = "#f6f4ef"; // off-white (--on-ink)

const SHIELD =
  "M131 5.135L257 34.69V166.913C257 246.246 201 285.135 131 308.468C61 285.135 5 246.246 5 166.913V34.69L131 5.135Z";
const SCROLL_LEFT =
  "M131 114.023H61C54.605 114.023 48.472 116.564 43.95 121.085C39.429 125.607 36.888 131.74 36.888 138.135C36.888 144.529 39.429 150.662 43.95 155.184C48.472 159.705 54.605 162.246 61 162.246C65.744 162.246 70.294 160.361 73.649 157.006C77.004 153.651 78.888 149.101 78.888 144.357C78.888 139.612 77.004 135.062 73.649 131.707C70.294 128.353 65.744 126.468 61 126.468C58.318 126.468 55.746 127.533 53.85 129.429C51.954 131.326 50.888 133.897 50.888 136.579C50.888 139.261 51.954 141.832 53.85 143.729C55.746 145.625 58.318 146.69 61 146.69";
const SCROLL_RIGHT =
  "M131 114.023H201C207.394 114.023 213.527 116.564 218.049 121.085C222.57 125.607 225.111 131.74 225.111 138.135C225.111 144.529 222.57 150.662 218.049 155.184C213.527 159.705 207.394 162.246 201 162.246C196.255 162.246 191.705 160.361 188.35 157.006C184.995 153.651 183.111 149.101 183.111 144.357C183.111 139.612 184.995 135.062 188.35 131.707C191.705 128.353 196.255 126.468 201 126.468C203.681 126.468 206.253 127.533 208.149 129.429C210.045 131.326 211.111 133.897 211.111 136.579C211.111 139.261 210.045 141.832 208.149 143.729C206.253 145.625 203.681 146.69 201 146.69";
const COLUMNS = "M94.444 170.801V316.245M131 170.801V316.245M167.555 170.801V316.245";
const BARS = "M90.555 135.801H171.444M90.555 152.912H171.444";

/**
 * The shield in its 262x314 box. `weight` thickens every stroke (small sizes need it: at 16px the source
 * strokes would be under half a pixel).
 */
const shield = (id, colour, weight = 1) => `
  <clipPath id="${id}"><path d="${SHIELD}"/></clipPath>
  <g fill="none" stroke="${colour}">
    <path clip-path="url(#${id})" d="${COLUMNS}" stroke-width="${14 * weight}"/>
    <path d="${SHIELD}" stroke-width="${10 * weight}"/>
    <path d="${SCROLL_LEFT}" stroke-width="${10 * weight}" stroke-linecap="round"/>
    <path d="${SCROLL_RIGHT}" stroke-width="${10 * weight}" stroke-linecap="round"/>
    <path d="${BARS}" stroke-width="${9 * weight}"/>
  </g>`;

// icon.svg (64x64 tile): heavier strokes so the shield reads at 16px in a tab.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${BRAND_PAPER}"/>
  <g transform="translate(32 32) scale(0.162) translate(-131 -157)">${shield("icon-shield", BRAND_INK, 1.7)}
  </g>
</svg>
`;
writeFileSync("src/app/icon.svg", icon);

// favicon.ico: PNG-compressed 16 / 32 / 48 px images.
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) => sharp(Buffer.from(icon), { density: 72 * (s / 64) * 4 }).resize(s, s).png().toBuffer()),
);
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

// og-default.png: 1200x630, the lockup (shield + rule + «DIPLOMAT / HALL») and the tagline.
// The wordmark asks for Cormorant SC; sharp only sees system fonts, so it falls back to a classic serif in caps.
const SERIF = "'Cormorant SC', 'Cormorant Garamond', Garamond, Georgia, 'Times New Roman', serif";
const SANS = "'Sofia Sans', 'Segoe UI', Arial, sans-serif";
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BRAND_PAPER}"/>
  <g transform="translate(96 96) scale(0.8)">${shield("og-shield", BRAND_INK)}
  </g>
  <rect x="345" y="126" width="2" height="192" fill="${BRAND_INK}"/>
  <g font-family="${SERIF}" font-size="112" font-weight="400" letter-spacing="8" fill="${BRAND_INK}">
    <text x="400" y="204">DIPLOMAT</text>
    <text x="400" y="318">HALL</text>
  </g>
  <text x="96" y="470" font-family="${SANS}" font-size="44" font-weight="600" fill="${BRAND_INK}">${TAGLINE}</text>
  <text x="96" y="528" font-family="${SANS}" font-size="30" fill="${BRAND_INK}" fill-opacity="0.8">${SUBLINE}</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og-default.png");
console.log("icon.svg, favicon.ico and og-default.png written");

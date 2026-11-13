import localFont from "next/font/local";

// Sofia Sans Extra Condensed variable (SIL OFL, see OFL.txt), self-hosted like Sofia Sans: no request to Google Fonts.
// Headings, hero, prices and big numbers. Latin and Cyrillic files are split by unicode-range.
// The Cyrillic woff2 is modified (OFL allows it; no Reserved Font Name): its cmap points at the `.loclRUS` glyphs, so
// Ukrainian text gets the standard Cyrillic forms (т, д, и, л, п …) instead of the Bulgarian default ones. Redo this
// after replacing the file (fontTools: remap every codepoint whose glyph has a `.loclRUS` variant).
export const sofiaSansExtraCondensedLatin = localFont({
  src: "./sofia-sans-extra-condensed-latin-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans-extra-condensed",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const sofiaSansExtraCondensedCyrillic = localFont({
  src: "./sofia-sans-extra-condensed-cyrillic-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans-extra-condensed-cyrillic",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" },
  ],
});

// The hryvnia sign (U+20B4), missing from the family like in Sofia Sans: one glyph drawn from this font's own S
// (mirrored) plus two bars, per wght master; see `sofia-sans.ts`. Not preloaded.
export const sofiaSansExtraCondensedHryvnia = localFont({
  src: "./sofia-sans-extra-condensed-hryvnia-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans-extra-condensed-hryvnia",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+20B4" }],
});

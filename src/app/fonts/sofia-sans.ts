import localFont from "next/font/local";

// Sofia Sans variable (SIL OFL, see OFL.txt), self-hosted: no request to Google Fonts at build or runtime.
// Body, UI, forms, nav. Two files split by script: each is used only for its own unicode-range,
// so a Latin-only page never loads the Cyrillic file. The Cyrillic face goes in front of the Latin one in `--font-sans`.
// The Cyrillic woff2 is modified (OFL allows it; no Reserved Font Name): its cmap points at the `.loclRUS` glyphs, so
// Ukrainian text gets the standard Cyrillic forms (т, д, и, л, п …) instead of the Bulgarian default ones. Redo this
// after replacing the file (fontTools: remap every codepoint whose glyph has a `.loclRUS` variant).
export const sofiaSansLatin = localFont({
  src: "./sofia-sans-latin-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const sofiaSansCyrillic = localFont({
  src: "./sofia-sans-cyrillic-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans-cyrillic",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" },
  ],
});

// The hryvnia sign (U+20B4) is not in Sofia Sans at all (no subset has it), so prices in UAH fell back to a system
// font. This one-glyph file adds it: drawn from the font's own S, mirrored, plus two bars as thick as 80% of its
// hyphen, per wght master (gvar / HVAR follow the axis). Built with fontTools from the Google Fonts variable TTF and
// subset to U+20B4 only (~1.4 KB). Not preloaded: it loads only on pages that show ₴.
export const sofiaSansHryvnia = localFont({
  src: "./sofia-sans-hryvnia-wght-normal.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans-hryvnia",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+20B4" }],
});

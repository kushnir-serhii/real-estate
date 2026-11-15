import localFont from "next/font/local";

// Playfair Display variable (wght 400-900, normal style; SIL OFL, see OFL.txt), self-hosted: no request to Google Fonts
// at build or runtime. H1, H2, hero and section titles only. Latin and Cyrillic files are split by unicode-range, so a
// Latin-only page never loads the Cyrillic one. The Cyrillic face goes in front of the Latin one in `--font-display`.
export const playfairDisplayLatin = localFont({
  src: "./playfair-display-latin-wght-normal.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-playfair-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const playfairDisplayCyrillic = localFont({
  src: "./playfair-display-cyrillic-wght-normal.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-playfair-display-cyrillic",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" },
  ],
});

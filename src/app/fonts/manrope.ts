import localFont from "next/font/local";

// Manrope variable (SIL OFL, see OFL.txt), self-hosted: no request to Google Fonts at build or runtime.
// Two files split by script: each is used only for its own unicode-range, so a Latin-only page never loads the Cyrillic file.
// `--font-manrope` keeps its old name (Latin + the adjusted fallback); the Cyrillic face goes in front of it in `--font-sans`.
export const manropeLatin = localFont({
  src: "./manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const manropeCyrillic = localFont({
  src: "./manrope-cyrillic-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope-cyrillic",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" },
  ],
});

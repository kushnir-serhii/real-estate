import localFont from "next/font/local";

// Unbounded variable (SIL OFL, see OFL.txt), self-hosted like Manrope: no request to Google Fonts.
// Headings, hero, prices and big numbers. Latin and Cyrillic files are split by unicode-range.
export const unboundedLatin = localFont({
  src: "./unbounded-latin-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-unbounded",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const unboundedCyrillic = localFont({
  src: "./unbounded-cyrillic-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-unbounded-cyrillic",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" },
  ],
});

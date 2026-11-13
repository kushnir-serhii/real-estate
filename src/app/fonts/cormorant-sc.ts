import localFont from "next/font/local";

// Cormorant SC 600 (SIL OFL, see OFL.txt), self-hosted: the logo wordmark only ("DIPLOMAT / HALL"), so Latin only.
// Not preloaded: no public page uses it yet (the logo arrives in spec 018 slice 4; revisit preload then).
export const cormorantSc = localFont({
  src: "./cormorant-sc-latin-600-normal.woff2",
  weight: "600",
  style: "normal",
  variable: "--font-cormorant-sc",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

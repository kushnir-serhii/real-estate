import type { Metadata } from "next";

import { BRAND, OG_DEFAULT_IMAGE } from "@/constants/brand";
import { getSiteUrl } from "@/lib/site-url";
import { CATALOG_VIEW_INIT_SCRIPT } from "@/features/catalog/catalog-view";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { cormorantSc } from "./fonts/cormorant-sc";
import { sofiaSansCyrillic, sofiaSansHryvnia, sofiaSansLatin } from "./fonts/sofia-sans";
import { playfairDisplayCyrillic, playfairDisplayLatin } from "./fonts/playfair-display";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: BRAND.siteTitle, template: `%s — ${BRAND.name}` },
  description: BRAND.siteDescription,
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: BRAND.name,
    images: [OG_DEFAULT_IMAGE],
  },
  twitter: { card: "summary_large_image" },
};

const FONT_VARIABLES = [
  sofiaSansLatin.variable,
  sofiaSansCyrillic.variable,
  sofiaSansHryvnia.variable,
  playfairDisplayLatin.variable,
  playfairDisplayCyrillic.variable,
  cormorantSc.variable,
].join(" ");

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="uk" className={FONT_VARIABLES} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: `${THEME_INIT_SCRIPT};${CATALOG_VIEW_INIT_SCRIPT}` }} />
      <noscript>
        <style>{".nojs-only{display:block!important}.nojs-hide{display:none!important}"}</style>
      </noscript>
    </head>
    <body>{children}</body>
  </html>
);

export default RootLayout;

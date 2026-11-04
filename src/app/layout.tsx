import type { Metadata } from "next";

import { BRAND, OG_DEFAULT_IMAGE } from "@/constants/brand";
import { getSiteUrl } from "@/lib/site-url";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { manropeCyrillic, manropeLatin } from "./fonts/manrope";
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

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="uk" className={`${manropeLatin.variable} ${manropeCyrillic.variable}`} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
    </head>
    <body>{children}</body>
  </html>
);

export default RootLayout;

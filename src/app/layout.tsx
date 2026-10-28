import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { BRAND } from "@/constants/brand";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const getMetadataBase = () => {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("http://localhost:3000");
  }
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: { default: BRAND.siteTitle, template: `%s — ${BRAND.name}` },
  description: BRAND.siteDescription,
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="uk" className={manrope.variable} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
    </head>
    <body>{children}</body>
  </html>
);

export default RootLayout;

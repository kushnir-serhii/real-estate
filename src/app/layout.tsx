import type { Metadata } from "next";
import { Manrope } from "next/font/google";

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
  title: { default: "Lyndrik — агентство нерухомості", template: "%s — Lyndrik" },
  description:
    "Lyndrik — агентство нерухомості: купівля, продаж та оренда квартир і будинків. Допоможемо знайти житло та оформити угоду.",
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

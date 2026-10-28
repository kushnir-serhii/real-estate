import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyndrik",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="uk">
    <body>{children}</body>
  </html>
);

export default RootLayout;

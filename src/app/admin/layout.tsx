import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Адмінка 7 SKY", template: "%s · Адмінка 7 SKY" },
  robots: { index: false, follow: false },
};

const AdminRootLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default AdminRootLayout;

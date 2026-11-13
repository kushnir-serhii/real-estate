import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Адмінка Diplomat Hall", template: "%s · Адмінка Diplomat Hall" },
  robots: { index: false, follow: false },
};

const AdminRootLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default AdminRootLayout;

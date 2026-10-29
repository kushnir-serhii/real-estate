import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Адмінка Lyndrik", template: "%s · Адмінка Lyndrik" },
  robots: { index: false, follow: false },
};

const AdminRootLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default AdminRootLayout;

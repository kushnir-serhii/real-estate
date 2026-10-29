import { redirect } from "next/navigation";

import { AdminForbidden } from "@/features/admin/admin-forbidden";
import { AdminHeader } from "@/features/admin/admin-header";
import { AdminUnconfigured } from "@/features/admin/admin-unconfigured";
import { getAdminSession } from "@/lib/auth/admin-session";

const PanelLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getAdminSession();

  switch (session.state) {
    case "unconfigured":
      return <AdminUnconfigured />;
    case "anonymous":
      redirect("/admin/sign-in");
    case "forbidden":
      return <AdminForbidden email={session.email} />;
    case "admin":
      return (
        <div className="flex min-h-dvh flex-col">
          <AdminHeader email={session.email} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        </div>
      );
    default: {
      const unreachable: never = session;
      return unreachable;
    }
  }
};

export default PanelLayout;

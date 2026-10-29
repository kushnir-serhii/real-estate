import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PagesList } from "@/features/admin/pages/pages-list";
import { requireAdmin } from "@/lib/auth/admin-session";
import { listAdminPages } from "@/lib/db/admin-pages";

export const metadata: Metadata = { title: "Сторінки" };

const AdminPagesPage = async () => {
  // `listAdminPages` uses the service role: check the admin first (the layout does too).
  const admin = await requireAdmin();
  if (!admin.ok) notFound();
  const pages = await listAdminPages();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Сторінки</h1>
        <p className="max-w-prose text-muted-foreground">
          Тексти й SEO статичних сторінок сайту. Поки сторінку не змінено, на сайті показується стандартний текст.
        </p>
      </div>
      <PagesList pages={pages} />
    </div>
  );
};

export default AdminPagesPage;

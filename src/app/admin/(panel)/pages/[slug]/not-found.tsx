import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_PAGES_PATH } from "@/features/admin/pages/page-labels";

/** Rendered inside the admin shell for any slug other than the four fixed pages. */
const AdminPageNotFound = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
    <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="max-w-prose text-muted-foreground">
        В адмінці редагуються лише головна, «Про агентство», «Контакти» й політика конфіденційності. Оберіть
        сторінку зі списку.
      </p>
    </div>
    <Link href={ADMIN_PAGES_PATH} className={buttonVariants()}>
      <ArrowLeft aria-hidden="true" />
      До списку сторінок
    </Link>
  </div>
);

export default AdminPageNotFound;

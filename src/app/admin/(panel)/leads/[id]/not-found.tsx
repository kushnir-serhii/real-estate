import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_LEADS_PATH } from "@/features/admin/leads/leads-params";

/** Rendered inside the admin shell when the lead id is wrong or the lead is gone. */
const AdminLeadNotFound = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
    <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Заявку не знайдено</h1>
      <p className="max-w-prose text-muted-foreground">
        Можливо, посилання неповне або з помилкою. Знайдіть заявку в списку за ім&apos;ям чи телефоном.
      </p>
    </div>
    <Link href={ADMIN_LEADS_PATH} className={buttonVariants()}>
      <ArrowLeft aria-hidden="true" />
      До списку заявок
    </Link>
  </div>
);

export default AdminLeadNotFound;

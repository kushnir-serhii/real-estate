import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_PROPERTIES_PATH } from "@/features/admin/properties/properties-params";

/** Rendered inside the admin shell when the id is wrong or the property is gone (e.g. a deleted draft). */
const AdminPropertyNotFound = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
    <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Об&apos;єкт не знайдено</h1>
      <p className="max-w-prose text-muted-foreground">
        Можливо, посилання неповне або чернетку вже видалили. Знайдіть об&apos;єкт у списку за назвою, адресою чи
        номером Plektan.
      </p>
    </div>
    <Link href={ADMIN_PROPERTIES_PATH} className={buttonVariants()}>
      <ArrowLeft aria-hidden="true" />
      До списку об&apos;єктів
    </Link>
  </div>
);

export default AdminPropertyNotFound;

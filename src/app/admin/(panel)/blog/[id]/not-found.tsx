import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_BLOG_PATH } from "@/features/admin/blog/post-form-values";

/** Rendered inside the admin shell when the id is wrong or the post is gone (e.g. deleted). */
const AdminPostNotFound = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
    <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold">Статтю не знайдено</h1>
      <p className="max-w-prose text-muted-foreground">
        Можливо, посилання неповне або статтю вже видалили. Знайдіть її у списку за заголовком чи адресою.
      </p>
    </div>
    <Link href={ADMIN_BLOG_PATH} className={buttonVariants()}>
      <ArrowLeft aria-hidden="true" />
      До списку статей
    </Link>
  </div>
);

export default AdminPostNotFound;

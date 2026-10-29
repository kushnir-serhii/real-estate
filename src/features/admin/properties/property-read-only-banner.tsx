import { Info } from "lucide-react";
import Link from "next/link";

import type { PropertyOrigin } from "@/lib/db/property-permissions";
import { ADMIN_SETTINGS_PATH } from "./properties-params";

type PropertyReadOnlyBannerProps = { source: PropertyOrigin };

const TEXT: Record<PropertyOrigin, string> = {
  plektan:
    "Цей об'єкт приходить з Plektan, тож тут можна змінити лише SEO. Решту редагуйте в Plektan — зміни з'являться після наступної синхронізації.",
  admin:
    "Каталог зараз веде Plektan. Цей об'єкт додано в адмінці: його можна опублікувати чи сховати, а змінити — лише SEO.",
};

/** `plektan` mode: why most fields are locked and how to change that. */
export const PropertyReadOnlyBanner = ({ source }: PropertyReadOnlyBannerProps) => (
  <div className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
    <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    <p className="max-w-prose">
      {TEXT[source]} Щоб редагувати об&apos;єкти тут, змініть джерело{" "}
      <Link
        href={ADMIN_SETTINGS_PATH}
        className="font-medium text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        в налаштуваннях
      </Link>
      .
    </p>
  </div>
);

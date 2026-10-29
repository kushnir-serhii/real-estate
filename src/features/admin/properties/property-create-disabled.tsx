import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ADMIN_PROPERTIES_PATH, ADMIN_SETTINGS_PATH } from "./properties-params";

/** `/admin/properties/new` in `plektan` mode: why there is no form and where to go. */
export const PropertyCreateDisabled = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Зараз об&apos;єкти додаються в Plektan</h2>
      <p className="max-w-prose text-muted-foreground">
        Каталог веде Plektan: нові об&apos;єкти з&apos;являються на сайті після синхронізації. Щоб додавати їх тут,
        змініть джерело в налаштуваннях.
      </p>
    </div>
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <Link href={ADMIN_SETTINGS_PATH} className={buttonVariants()}>
        <Settings aria-hidden="true" />
        До налаштувань
      </Link>
      <Link href={ADMIN_PROPERTIES_PATH} className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft aria-hidden="true" />
        До списку об&apos;єктів
      </Link>
    </div>
  </div>
);

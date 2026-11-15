import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";
import { RetryButton } from "./retry-button";

/** Whole-section empty state (no data at all): ask to call. */
export const PropertiesEmpty = () => (
  <div className="flex flex-col items-start gap-4 border border-dashed border-border p-6">
    <p className="text-muted-foreground">
      Скоро тут з&apos;являться нові об&apos;єкти. А поки зателефонуйте нам, і ми підберемо варіанти під ваш
      запит.
    </p>
    <div className="flex flex-wrap gap-2">
      <a href={CONTACTS.phone.href} className={buttonVariants()}>
        {CONTACTS.phone.display}
      </a>
      <Link href="/contacts" className={buttonVariants({ variant: "outline" })}>
        Контакти
      </Link>
    </div>
  </div>
);

export const PropertiesError = () => (
  <div role="alert" className="flex flex-col items-start gap-4 border border-destructive/40 p-6">
    <p className="font-medium text-destructive">Не вдалося завантажити об&apos;єкти</p>
    <RetryButton />
  </div>
);

import { SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { CONTACTS } from "@/constants/contacts";

type CatalogEmptyProps =
  | { kind: "filtered"; resetHref: string }
  | { kind: "nothing" }
  | { kind: "out-of-range"; firstPageHref: string };

const TEXT: Record<CatalogEmptyProps["kind"], { title: string; body: string }> = {
  filtered: {
    title: "За цими фільтрами нічого не знайшли",
    body: "Спробуйте прибрати частину фільтрів або розширити ціну чи площу. Або зателефонуйте нам — підберемо варіанти під ваш запит.",
  },
  nothing: {
    title: "Поки що тут порожньо",
    body: "Скоро з'являться нові об'єкти. А поки зателефонуйте нам — підберемо варіанти під ваш запит.",
  },
  "out-of-range": {
    title: "Такої сторінки немає",
    body: "Можливо, частину об'єктів уже продано. Почніть з першої сторінки.",
  },
};

export const CatalogEmpty = (props: CatalogEmptyProps) => {
  const text = TEXT[props.kind];
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-control bg-card p-6 sm:p-10">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-dawn text-dawn-foreground"
      >
        <SearchX className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.kind === "filtered" && (
          <Link href={props.resetHref} className={buttonVariants({ variant: "dawn" })}>
            Скинути фільтри
          </Link>
        )}
        {props.kind === "out-of-range" && (
          <Link href={props.firstPageHref} className={buttonVariants({ variant: "dawn" })}>
            На першу сторінку
          </Link>
        )}
        <a
          href={CONTACTS.phone.href}
          className={buttonVariants({ variant: props.kind === "nothing" ? "dawn" : "outline" })}
        >
          <span className="tabular-nums">{CONTACTS.phone.display}</span>
        </a>
        <Link href="/contacts" className={buttonVariants({ variant: "outline" })}>
          Контакти
        </Link>
      </div>
    </div>
  );
};

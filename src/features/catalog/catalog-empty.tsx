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
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.kind === "filtered" && (
          <Link href={props.resetHref} className={buttonVariants()}>
            Скинути фільтри
          </Link>
        )}
        {props.kind === "out-of-range" && (
          <Link href={props.firstPageHref} className={buttonVariants()}>
            На першу сторінку
          </Link>
        )}
        <a
          href={CONTACTS.phone.href}
          className={buttonVariants({ variant: props.kind === "nothing" ? "default" : "outline" })}
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

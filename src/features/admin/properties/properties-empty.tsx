import { Building2, Plus, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { canCreateProperty } from "@/lib/db/property-permissions";
import { NEW_PROPERTY_PATH } from "./properties-params";

type PropertiesEmptyProps =
  | { kind: "none"; mode: PropertiesMode }
  | { kind: "filtered"; resetHref: string }
  | { kind: "out-of-range"; firstPageHref: string };

const NONE_BODY: Record<PropertiesMode, string> = {
  admin: "Додайте перший об'єкт: він збережеться як чернетка, а на сайті з'явиться після публікації.",
  plektan: "Об'єкти з'являться тут після синхронізації з Plektan.",
};

const TEXT: Record<Exclude<PropertiesEmptyProps["kind"], "none">, { title: string; body: string }> = {
  filtered: {
    title: "Нічого не знайдено",
    body: "Жоден об'єкт не підходить під ці умови. Змініть пошук чи фільтри або скиньте їх.",
  },
  "out-of-range": {
    title: "Тут порожньо",
    body: "На цій сторінці об'єктів немає. Почніть з першої сторінки.",
  },
};

export const PropertiesEmpty = (props: PropertiesEmptyProps) => {
  const text =
    props.kind === "none" ? { title: "Об'єктів ще немає", body: NONE_BODY[props.mode] } : TEXT[props.kind];
  const Icon = props.kind === "none" ? Building2 : SearchX;
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
      {props.kind === "none" && canCreateProperty(props.mode) && (
        <Link href={NEW_PROPERTY_PATH} className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Додати об&apos;єкт
        </Link>
      )}
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
    </div>
  );
};

import { Inbox, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type LeadsEmptyProps =
  | { kind: "none" }
  | { kind: "filtered"; resetHref: string }
  | { kind: "out-of-range"; firstPageHref: string };

const TEXT: Record<LeadsEmptyProps["kind"], { title: string; body: string }> = {
  none: {
    title: "Заявок ще немає",
    body: "Тут з'являтимуться заявки з форм на сайті та від AI-помічника: хто і коли залишив заявку і чи дійшла вона до Plektan і Telegram.",
  },
  filtered: {
    title: "Нічого не знайдено",
    body: "Жодна заявка не підходить під ці умови. Змініть пошук чи дати або скиньте фільтри.",
  },
  "out-of-range": {
    title: "Тут порожньо",
    body: "На цій сторінці заявок немає. Почніть з першої сторінки.",
  },
};

export const LeadsEmpty = (props: LeadsEmptyProps) => {
  const text = TEXT[props.kind];
  const Icon = props.kind === "none" ? Inbox : SearchX;
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
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

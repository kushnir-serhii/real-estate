import { FileText, Plus, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_BLOG_PATH, NEW_POST_PATH } from "./post-form-values";

type PostsEmptyProps = { kind: "none" } | { kind: "filtered" } | { kind: "out-of-range"; firstPageHref: string };

const TEXT: Record<PostsEmptyProps["kind"], { title: string; body: string }> = {
  none: {
    title: "Статей ще немає",
    body: "Напишіть першу статтю: вона збережеться як чернетка, а на сайті з'явиться після публікації.",
  },
  filtered: {
    title: "Нічого не знайдено",
    body: "Жодна стаття не підходить під ці умови. Змініть пошук чи фільтри або скиньте їх.",
  },
  "out-of-range": { title: "Тут порожньо", body: "На цій сторінці статей немає. Почніть з першої сторінки." },
};

export const PostsEmpty = (props: PostsEmptyProps) => {
  const text = TEXT[props.kind];
  const Icon = props.kind === "none" ? FileText : SearchX;
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">{text.title}</h2>
        <p className="max-w-prose text-muted-foreground">{text.body}</p>
      </div>
      {props.kind === "none" && (
        <Link href={NEW_POST_PATH} className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Нова стаття
        </Link>
      )}
      {props.kind === "filtered" && (
        <Link href={ADMIN_BLOG_PATH} className={buttonVariants()}>
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

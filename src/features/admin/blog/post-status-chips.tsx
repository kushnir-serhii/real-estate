import { EyeOff, FileCheck, PencilLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PostStatus } from "@/lib/db/post-query";
import { cn } from "@/lib/utils";

type PostStatusChipsProps = {
  status: PostStatus;
  /** Hidden from search engines (shown in the edit header). */
  noindex?: boolean;
  className?: string;
};

type Chip = { key: string; label: string; icon: LucideIcon; className: string };

const chipsOf = (status: PostStatus, noindex: boolean): Chip[] => {
  const chips: Chip[] = [
    status === "published"
      ? { key: "status", label: "Опубліковано", icon: FileCheck, className: "bg-success/10 text-success" }
      : { key: "status", label: "Чернетка", icon: PencilLine, className: "bg-muted text-muted-foreground" },
  ];
  if (noindex) {
    chips.push({ key: "noindex", label: "Не індексується", icon: EyeOff, className: "bg-warning/10 text-warning" });
  }
  return chips;
};

/** Post status in the admin: icon + word, never color alone. */
export const PostStatusChips = ({ status, noindex = false, className }: PostStatusChipsProps) => (
  <ul aria-label="Стан статті" className={cn("flex flex-wrap items-center gap-1.5", className)}>
    {chipsOf(status, noindex).map(({ key, label, icon: Icon, className: tone }) => (
      <li
        key={key}
        className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone)}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </li>
    ))}
  </ul>
);

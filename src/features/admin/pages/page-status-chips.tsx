import { EyeOff, FileCheck, PencilLine, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AdminPageListItem } from "@/lib/db/admin-pages";
import { cn } from "@/lib/utils";

type PageStatusChipsProps = {
  page: Pick<AdminPageListItem, "state" | "noindex" | "is_draft">;
  className?: string;
};

type Chip = { key: string; label: string; icon: LucideIcon; className: string };

const chipsOf = ({ state, noindex, is_draft }: PageStatusChipsProps["page"]): Chip[] => {
  const chips: Chip[] = [
    state === "custom"
      ? { key: "state", label: "Змінена", icon: PencilLine, className: "bg-secondary text-secondary-foreground" }
      : { key: "state", label: "Стандартна", icon: FileCheck, className: "bg-muted text-muted-foreground" },
  ];
  if (noindex) {
    chips.push({ key: "noindex", label: "Не індексується", icon: EyeOff, className: "bg-warning/10 text-warning" });
  }
  if (is_draft) {
    chips.push({ key: "draft", label: "Чернетка", icon: TriangleAlert, className: "bg-warning/10 text-warning" });
  }
  return chips;
};

/** Page status in the admin: icon + word, never color alone. */
export const PageStatusChips = ({ page, className }: PageStatusChipsProps) => (
  <ul aria-label="Стан сторінки" className={cn("flex flex-wrap items-center gap-1.5", className)}>
    {chipsOf(page).map(({ key, label, icon: Icon, className: tone }) => (
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

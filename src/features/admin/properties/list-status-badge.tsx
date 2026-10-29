import { CircleCheck, EyeOff, PencilLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AdminListStatus } from "@/lib/db/admin-property-filters";
import { cn } from "@/lib/utils";

type ListStatusBadgeProps = { status: AdminListStatus; className?: string };

const STATUS: Record<AdminListStatus, { label: string; icon: LucideIcon; className: string }> = {
  published: { label: "Опубліковано", icon: CircleCheck, className: "bg-success/10 text-success" },
  hidden: { label: "Приховано", icon: EyeOff, className: "bg-muted text-muted-foreground" },
  draft: { label: "Чернетка", icon: PencilLine, className: "bg-warning/10 text-warning" },
};

/** Property status in the admin list: icon + word, never color alone. */
export const ListStatusBadge = ({ status, className }: ListStatusBadgeProps) => {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
};

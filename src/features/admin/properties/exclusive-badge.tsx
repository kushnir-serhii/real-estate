import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** «Ексклюзив» marker in the admin list: icon + word, never color alone. */
export const ExclusiveBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-control bg-primary/10 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary",
      className,
    )}
  >
    <Star className="size-3.5 shrink-0" aria-hidden="true" />
    Ексклюзив
  </span>
);

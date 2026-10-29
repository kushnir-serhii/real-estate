import { CircleAlert, CircleCheck, CircleMinus, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

type DeliveryBadgeProps = {
  status: DeliveryStatus;
  /** Visible channel name before the badge (cards); in the table the column header names it. */
  channel?: string;
  className?: string;
};

const STATUS: Record<DeliveryStatus, { label: string; icon: LucideIcon; className: string }> = {
  sent: { label: "Надіслано", icon: CircleCheck, className: "bg-success/10 text-success" },
  pending: { label: "Очікує", icon: Clock, className: "bg-warning/10 text-warning" },
  failed: { label: "Помилка", icon: CircleAlert, className: "bg-destructive/10 text-destructive" },
  skipped: { label: "Вимкнено", icon: CircleMinus, className: "bg-muted text-muted-foreground" },
};

/** Delivery status of one channel: icon + word, never color alone. */
export const DeliveryBadge = ({ status, channel, className }: DeliveryBadgeProps) => {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      {channel && (
        <span className="text-muted-foreground">
          {channel}
          <span className="sr-only">:</span>
        </span>
      )}
      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium whitespace-nowrap", tone)}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </span>
    </span>
  );
};

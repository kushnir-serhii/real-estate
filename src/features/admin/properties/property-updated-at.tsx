import { formatKyivDateTime } from "@/lib/format/format-kyiv-date-time";
import { cn } from "@/lib/utils";

type PropertyUpdatedAtProps = {
  iso: string;
  /** `stacked`: date over time (table); `inline`: «Оновлено 29.10.2026, 14:05» (cards). */
  layout: "stacked" | "inline";
  className?: string;
};

export const PropertyUpdatedAt = ({ iso, layout, className }: PropertyUpdatedAtProps) => {
  const { date, time } = formatKyivDateTime(iso);
  return layout === "stacked" ? (
    <time dateTime={iso} className={cn("flex flex-col tabular-nums", className)}>
      <span>{date}</span>
      <span className="text-muted-foreground">{time}</span>
    </time>
  ) : (
    <span className={cn("tabular-nums", className)}>
      Оновлено <time dateTime={iso}>{`${date}, ${time}`}</time>
    </span>
  );
};

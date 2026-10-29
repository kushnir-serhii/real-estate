import { formatKyivDateTime } from "@/lib/format/format-kyiv-date-time";
import { cn } from "@/lib/utils";

type LeadDateTimeProps = {
  iso: string;
  /** `stacked`: date over time (table); `inline`: «29.10.2026, 14:05» (cards). */
  layout: "stacked" | "inline";
  className?: string;
};

export const LeadDateTime = ({ iso, layout, className }: LeadDateTimeProps) => {
  const { date, time } = formatKyivDateTime(iso);
  return (
    <time dateTime={iso} className={cn("tabular-nums", layout === "stacked" && "flex flex-col", className)}>
      <span>
        {date}
        {layout === "inline" && ", "}
      </span>
      <span className={layout === "stacked" ? "text-muted-foreground" : undefined}>{time}</span>
    </time>
  );
};

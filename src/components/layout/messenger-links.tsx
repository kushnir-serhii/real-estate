import { MessageCircle, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CONTACTS } from "@/constants/contacts";

type MessengerLinksProps = {
  className?: string;
  /** `ink`: for dark surfaces (footer). */
  tone?: "default" | "ink";
};

type MessengerKey = keyof typeof CONTACTS.messengers;

const ICONS: Record<MessengerKey, LucideIcon> = {
  telegram: Send,
  viber: MessageCircle,
  whatsapp: MessageCircle,
};

const LINK_TONE = {
  default: "border-border text-foreground hover:bg-muted",
  ink: "border-ink-border text-on-ink hover:bg-on-ink/10",
} as const;

// as: Object.keys loses the literal key type
const KEYS = Object.keys(CONTACTS.messengers) as MessengerKey[];

export const MessengerLinks = ({ className, tone = "default" }: MessengerLinksProps) => {
  const items = KEYS.flatMap((key) => {
    const { label, url, enabled } = CONTACTS.messengers[key];
    return enabled && url !== null ? [{ key, label, url: String(url) }] : [];
  });

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ key, label, url }) => {
        const Icon = ICONS[key];
        return (
          <li key={key}>
            <a
              href={url}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none transition-colors duration-(--duration-base) focus-visible:ring-3 focus-visible:ring-ring/50",
                LINK_TONE[tone],
              )}
              {...(url.startsWith("http")
                ? { target: "_blank", rel: "noopener" }
                : {})}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
};

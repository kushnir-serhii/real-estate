import { MessageCircle, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CONTACTS } from "@/constants/contacts";

type MessengerLinksProps = { className?: string };

type MessengerKey = keyof typeof CONTACTS.messengers;

const ICONS: Record<MessengerKey, LucideIcon> = {
  telegram: Send,
  viber: MessageCircle,
  whatsapp: MessageCircle,
};

// as: Object.keys loses the literal key type
const KEYS = Object.keys(CONTACTS.messengers) as MessengerKey[];

export const MessengerLinks = ({ className }: MessengerLinksProps) => {
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
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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

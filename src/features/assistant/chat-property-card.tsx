"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { AssistantPropertyCard } from "./assistant-events";

type ChatPropertyCardProps = {
  card: AssistantPropertyCard;
  /** Called on click, before the site navigates (closes the full-screen panel on phones). */
  onNavigate?: () => void;
};

// Intrinsic size of the thumbnail (4:3, the box is fixed by CSS anyway): no layout shift while it loads.
const THUMB_WIDTH = 96;
const THUMB_HEIGHT = 72;

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

const buildFacts = (card: AssistantPropertyCard): string[] => [
  ...(card.rooms !== null ? [`${card.rooms} кімн.`] : []),
  ...(card.area_total !== null ? [`${numberFormat.format(card.area_total)} м²`] : []),
  ...(card.district ? [card.district] : []),
];

/**
 * Compact property row in the chat: thumbnail left, price / title / facts right; the whole row links to the
 * property. The photo is decorative (`alt=""`): the title is already in the link text, as on the site's card.
 */
export const ChatPropertyCard = ({ card, onNavigate }: ChatPropertyCardProps) => {
  // Remembers which photo failed, so a different photo on the same row gets its own chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoUrl = card.photo_url !== null && card.photo_url !== failedUrl ? card.photo_url : null;
  const facts = buildFacts(card);

  return (
    <Link
      href={card.url}
      onClick={onNavigate}
      className="flex min-h-11 gap-3 rounded-xl bg-card p-2 text-card-foreground ring-1 ring-foreground/10 outline-none transition-shadow hover:ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring"
    >
      <span className="flex aspect-4/3 w-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
          <img
            src={photoUrl}
            alt=""
            width={THUMB_WIDTH}
            height={THUMB_HEIGHT}
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(photoUrl)}
            className="size-full object-cover"
          />
        ) : (
          <>
            <Building2 className="size-6" aria-hidden="true" />
            <span className="sr-only">Фото незабаром</span>
          </>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold tabular-nums">{card.price}</span>
        <span className="line-clamp-2 text-sm font-medium break-words" title={card.title}>
          {card.title}
        </span>
        {facts.length > 0 && (
          <span className="text-sm break-words text-muted-foreground">{facts.join(" · ")}</span>
        )}
      </span>
    </Link>
  );
};

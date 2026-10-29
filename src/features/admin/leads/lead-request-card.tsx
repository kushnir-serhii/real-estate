import { EyeOff } from "lucide-react";

import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";
import type { AdminLeadDetail } from "@/lib/db/admin-leads";
import { ExternalLink } from "./external-link";
import { LeadFacts } from "./lead-facts";
import type { LeadFact } from "./lead-facts";
import { LeadSection } from "./lead-section";
import { readLeadWishes } from "./read-lead-wishes";

type LeadRequestCardProps = { lead: Pick<AdminLeadDetail, "kind" | "message" | "payload" | "property"> };

const DEAL_WISH = { buy: "купити", rent: "орендувати" } as const;

const catalogHref = (slug: string) => `/catalog/${slug}`;

const PropertyValue = ({ property }: { property: NonNullable<AdminLeadDetail["property"]> }) => (
  <div className="flex flex-col items-start gap-1">
    {property.status === "published" ? (
      <ExternalLink href={catalogHref(property.slug)}>{property.title}</ExternalLink>
    ) : (
      <span className="font-medium wrap-anywhere">{property.title}</span>
    )}
    {property.source === "plektan" && property.external_id && (
      <span className="text-muted-foreground tabular-nums">№ у Plektan {property.external_id}</span>
    )}
    {property.status === "hidden" && (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-0.5 text-warning">
        <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
        Об&apos;єкт знято з публікації, на сайті його не видно
      </span>
    )}
  </div>
);

/** What the client asked about: the property, their wishes (general / AI leads) and the message. */
export const LeadRequestCard = ({ lead }: LeadRequestCardProps) => {
  const wishes = readLeadWishes(lead.payload);
  const facts: LeadFact[] = [];

  if (lead.property) {
    facts.push({ label: "Об'єкт", value: <PropertyValue property={lead.property} /> });
  } else if (lead.kind === "property_request") {
    facts.push({ label: "Об'єкт", value: <span className="text-muted-foreground">Об&apos;єкт видалено з сайту</span> });
  }
  if (wishes.deal) facts.push({ label: "Хоче", value: DEAL_WISH[wishes.deal] });
  if (wishes.propertyType) facts.push({ label: "Тип", value: PROPERTY_TYPE_LABELS[wishes.propertyType] });
  if (wishes.similarTo) {
    facts.push({
      label: "Схожий на",
      value: <ExternalLink href={catalogHref(wishes.similarTo.slug)}>{wishes.similarTo.title}</ExternalLink>,
    });
  }

  const isEmpty = facts.length === 0 && !lead.message;

  return (
    <LeadSection id="request" title="Запит">
      {facts.length > 0 && <LeadFacts facts={facts} />}
      {lead.message ? (
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="text-muted-foreground">Повідомлення</h3>
          <p className="rounded-lg bg-muted/60 px-4 py-3 text-base whitespace-pre-line wrap-anywhere">
            {lead.message}
          </p>
        </div>
      ) : (
        !isEmpty && <p className="text-sm text-muted-foreground">Повідомлення клієнт не залишив.</p>
      )}
      {isEmpty && (
        <p className="text-sm text-muted-foreground">
          Клієнт нічого не уточнив: ні об&apos;єкта, ні побажань, ні повідомлення. Зателефонуйте й розпитайте.
        </p>
      )}
    </LeadSection>
  );
};

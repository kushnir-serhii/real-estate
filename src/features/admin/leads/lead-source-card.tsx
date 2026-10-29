import type { AdminLeadDetail } from "@/lib/db/admin-leads";
import { ExternalLink } from "./external-link";
import { LeadDateTime } from "./lead-date-time";
import { LeadFacts } from "./lead-facts";
import type { LeadFact } from "./lead-facts";
import { LeadSection } from "./lead-section";
import { readLeadUtm } from "./read-lead-utm";

type LeadSourceCardProps = { lead: Pick<AdminLeadDetail, "page_url" | "utm" | "consent_at"> };

const UTM_LABELS: Record<string, string> = {
  utm_source: "Джерело",
  utm_medium: "Канал",
  utm_campaign: "Кампанія",
  utm_content: "Оголошення",
  utm_term: "Ключове слово",
};

/** Only our own paths and http(s) URLs become links; anything else is shown as text. */
const pageHref = (url: string): string | null => {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return /^https?:\/\//i.test(url) ? url : null;
};

/** Where the lead came from: the page, UTM tags (only when present) and the consent time. */
export const LeadSourceCard = ({ lead }: LeadSourceCardProps) => {
  // jsonb doesn't keep key order: known tags in the usual order, then the rest.
  const order = Object.keys(UTM_LABELS);
  const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
  const utm = readLeadUtm(lead.utm).toSorted(([a], [b]) => rank(a) - rank(b));
  const facts: LeadFact[] = [];

  if (lead.page_url) {
    const href = pageHref(lead.page_url);
    facts.push({
      label: "Сторінка",
      value: href ? (
        <ExternalLink href={href} title={lead.page_url} truncate className="w-full">
          {lead.page_url}
        </ExternalLink>
      ) : (
        <span className="block truncate" title={lead.page_url}>
          {lead.page_url}
        </span>
      ),
    });
  }
  facts.push({
    label: "Згода на обробку даних",
    value: <LeadDateTime iso={lead.consent_at} layout="inline" />,
  });

  return (
    <LeadSection id="source" title="Звідки">
      <LeadFacts facts={facts} />
      {utm.length > 0 && (
        <div className="flex flex-col gap-2 text-sm">
          <h3 className="font-medium">Рекламна мітка (UTM)</h3>
          <LeadFacts
            facts={utm.map(([key, value]) => ({
              label: UTM_LABELS[key] ?? key,
              value: <span title={key}>{value}</span>,
            }))}
          />
        </div>
      )}
    </LeadSection>
  );
};

import { ArrowRight, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { countObjects } from "@/lib/format/count-objects";
import { ChatPropertyCard } from "./chat-property-card";
import type { PropertiesPart } from "./chat-reducer";

type AssistantPropertyResultsProps = {
  part: PropertiesPart;
  /** Called when the visitor follows a card or the catalog link. */
  onNavigate?: () => void;
};

const numberFormat = new Intl.NumberFormat("uk-UA");

export const EMPTY_RESULTS_TEXT = "Таких об'єктів зараз немає";

/** What the live region says when results arrive: «Знайдено 12 об'єктів, показано 5». */
export const resultsAnnouncement = ({ items, total }: PropertiesPart): string => {
  if (total === 0) return EMPTY_RESULTS_TEXT;
  const found = `Знайдено ${countObjects(total)}`;
  return total > items.length ? `${found}, показано ${items.length}` : found;
};

/** One search's results inside an assistant reply: compact cards and a link to the same search in the catalog. */
export const AssistantPropertyResults = ({ part, onNavigate }: AssistantPropertyResultsProps) => {
  if (part.total === 0) {
    return (
      <p className="flex items-center gap-2 self-start rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
        <SearchX className="size-4 shrink-0" aria-hidden="true" />
        {EMPTY_RESULTS_TEXT}
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {part.items.length > 0 && (
        <ul aria-label={`Знайдено ${countObjects(part.total)}`} className="flex flex-col gap-2">
          {part.items.map((card) => (
            <li key={card.slug}>
              <ChatPropertyCard card={card} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
      {part.total > part.items.length && (
        <Button asChild variant="outline" className="self-start">
          <Link href={part.catalogUrl} onClick={onNavigate}>
            {/* One text node: the button's flex gap would split «(N)» apart. */}
            <span className="tabular-nums">{`Усі результати в каталозі (${numberFormat.format(part.total)})`}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
};

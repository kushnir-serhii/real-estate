import { Cloud, LayoutDashboard } from "lucide-react";

import type { SourceSwitchSummary } from "@/lib/db/admin-properties";
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { formatKyivDateTime } from "@/lib/format/format-kyiv-date-time";
import { countObjects } from "@/lib/format/count-objects";
import { SettingsSection } from "./settings-section";
import { SourceSwitch } from "./source-switch";
import { sourceSwitchConsequences } from "./source-switch-consequences";

type PropertiesSourceSectionProps = { summary: SourceSwitchSummary };

const MODE: Record<PropertiesMode, { name: string; text: string; Icon: typeof Cloud }> = {
  plektan: {
    name: "Plektan",
    text: "Об'єкти приходять з Plektan. Синхронізація кожні 30 хвилин; в адмінці можна змінювати лише SEO-поля.",
    Icon: Cloud,
  },
  admin: {
    name: "адмінка",
    text: "Об'єкти ведуться тут, в адмінці. Синхронізація з Plektan вимкнена.",
    Icon: LayoutDashboard,
  },
};

const OPPOSITE: Record<PropertiesMode, PropertiesMode> = { plektan: "admin", admin: "plektan" };

const NUMBER = new Intl.NumberFormat("uk-UA");

const countsText = ({ total, published }: { total: number; published: number }) =>
  total === 0 ? "немає" : `${countObjects(total)}, на сайті ${NUMBER.format(published)}`;

const LastSync = ({ iso }: { iso: string | null }) => {
  if (!iso) return <>ще не було</>;
  const { date, time } = formatKyivDateTime(iso);
  return (
    <time dateTime={iso} className="tabular-nums">
      {date}, {time}
    </time>
  );
};

/** «Джерело об'єктів»: the current mode in plain words, last sync, counts and the switch. */
export const PropertiesSourceSection = ({ summary }: PropertiesSourceSectionProps) => {
  const mode = MODE[summary.mode];
  const target = OPPOSITE[summary.mode];

  return (
    <SettingsSection id="source" title="Джерело об'єктів">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <mode.Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">Зараз: {mode.name}</p>
          <p className="max-w-prose text-sm text-muted-foreground">{mode.text}</p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Остання синхронізація</dt>
          <dd className="font-medium">
            <LastSync iso={summary.lastSyncAt} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">З Plektan</dt>
          <dd className="font-medium tabular-nums">{countsText(summary.plektan)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Створені в адмінці</dt>
          <dd className="font-medium tabular-nums">{countsText(summary.admin)}</dd>
        </div>
      </dl>

      <SourceSwitch target={target} consequences={sourceSwitchConsequences(target, summary)} />
    </SettingsSection>
  );
};

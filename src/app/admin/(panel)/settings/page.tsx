import type { Metadata } from "next";

import { ExchangeRatesForm } from "@/features/admin/settings/exchange-rates-form";
import { PropertiesSourceSection } from "@/features/admin/settings/properties-source-section";
import { SettingsSection } from "@/features/admin/settings/settings-section";
import { getSourceSwitchSummary } from "@/lib/db/admin-properties";
import { getSettings } from "@/lib/db/settings";

export const metadata: Metadata = { title: "Налаштування" };

// The panel layout checks the admin session before this renders (same as the leads page).
const AdminSettingsPage = async () => {
  const [summary, settings] = await Promise.all([getSourceSwitchSummary(), getSettings()]);
  const rates = settings.exchange_rates;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Налаштування</h1>
      <PropertiesSourceSection summary={summary} />
      <SettingsSection id="rates" title="Курси валют">
        <ExchangeRatesForm rates={rates} />
      </SettingsSection>
    </div>
  );
};

export default AdminSettingsPage;

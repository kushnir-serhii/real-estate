import { DemoResetButton } from "./demo-reset-button";

/** Demo driver only (the layout decides). Thin, calm, not dismissible; the reset lives here so it is on every admin screen. */
export const DemoBanner = () => (
  <div role="note" className="border-b bg-accent text-accent-foreground">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-0 px-4 py-1 text-sm">
      <p className="min-w-0 py-1.5 font-medium text-balance">Демо-режим: дані тестові, зміни скидаються</p>
      <DemoResetButton />
    </div>
  </div>
);

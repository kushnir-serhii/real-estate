import type { PropertiesMode } from "@/lib/db/property-permissions";

export type SwitchSourceState =
  | { status: "idle" }
  | { status: "switched"; mode: PropertiesMode }
  | { status: "unchanged"; mode: PropertiesMode }
  | { status: "error"; message: string };

export const INITIAL_SWITCH_SOURCE_STATE: SwitchSourceState = { status: "idle" };

export type RatesFieldErrors = { UAH?: string; EUR?: string };

export type SaveRatesState =
  | { status: "idle" }
  | { status: "saved"; recomputed: number }
  | { status: "invalid"; errors: RatesFieldErrors }
  | { status: "error"; message: string };

export const INITIAL_SAVE_RATES_STATE: SaveRatesState = { status: "idle" };

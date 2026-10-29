"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-session";
import { saveExchangeRates, setPropertiesSource } from "@/lib/db/admin-properties";
import { CACHE_TAGS } from "@/lib/db/cache-tags";
import { getSettings } from "@/lib/db/settings";
import { parseRateInput, ratesFormSchema } from "./rates-schema";
import type { RatesFieldErrors, SaveRatesState, SwitchSourceState } from "./settings-state";

const GENERIC_ERROR = "Не вдалося зберегти. Спробуйте ще раз.";
const NO_ACCESS = "Немає доступу";

const switchSchema = z.object({
  mode: z.enum(["plektan", "admin"]),
  confirm: z.literal("yes"),
});

const refresh = (tags: readonly string[]) => {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  revalidatePath("/admin/settings");
};

/** Switches the source of truth. Admin only; needs `confirm=yes` besides the target mode. Rewrites no property rows. */
export const switchPropertiesSource = async (
  _prev: SwitchSourceState,
  formData: FormData,
): Promise<SwitchSourceState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };

    const parsed = switchSchema.safeParse({ mode: formData.get("mode"), confirm: formData.get("confirm") });
    if (!parsed.success) return { status: "error", message: "Підтвердіть перемикання." };
    const { mode } = parsed.data;

    if ((await getSettings()).properties_source === mode) return { status: "unchanged", mode };

    await setPropertiesSource(mode);
    refresh([CACHE_TAGS.properties, CACHE_TAGS.settings]);
    return { status: "switched", mode };
  } catch {
    return { status: "error", message: GENERIC_ERROR };
  }
};

/** Saves UAH / EUR per 1 USD (comma decimals accepted) and recomputes price_usd of every priced property. */
export const saveExchangeRatesAction = async (
  _prev: SaveRatesState,
  formData: FormData,
): Promise<SaveRatesState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };

    const parsed = ratesFormSchema.safeParse({
      UAH: parseRateInput(formData.get("UAH")),
      EUR: parseRateInput(formData.get("EUR")),
    });
    if (!parsed.success) {
      const errors: RatesFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "UAH" || field === "EUR") && !errors[field]) errors[field] = issue.message;
      }
      return { status: "invalid", errors };
    }

    const { recomputed } = await saveExchangeRates(parsed.data);
    refresh([CACHE_TAGS.properties, CACHE_TAGS.settings]);
    return { status: "saved", recomputed };
  } catch {
    return { status: "error", message: GENERIC_ERROR };
  }
};

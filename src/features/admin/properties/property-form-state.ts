import type { GeocodeStatus } from "@/lib/db/admin-properties";
import type { PropertyFormErrors, PropertyFormRaw, PublishRequirement } from "./property-form-schema";

/** Result of `saveProperty`. `values` echoes what was typed so the form can be shown again after a rejection. */
export type PropertyFormState =
  | { status: "idle" }
  /** A new draft was saved: redirect to `/admin/properties/<id>`. */
  | { status: "created"; id: string; geocode: GeocodeStatus }
  /** Full save of an existing property. `slugChanged`: the draft's address on the site moved with the title. */
  | { status: "saved"; slug: string; slugChanged: boolean; geocode: GeocodeStatus }
  /** `plektan` mode: only the SEO fields were saved. */
  | { status: "seo_saved" }
  | { status: "invalid"; errors: PropertyFormErrors; values: PropertyFormRaw }
  | { status: "error"; message: string; values: PropertyFormRaw | null };

export const INITIAL_PROPERTY_FORM_STATE: PropertyFormState = { status: "idle" };

/** Result of `publishProperty`, `hideProperty` and `deleteDraft` (all post a hidden `id`). */
export type PropertyActionState =
  | { status: "idle" }
  | { status: "published" }
  | { status: "hidden" }
  /** Draft deleted: redirect to `/admin/properties`. */
  | { status: "deleted" }
  | { status: "incomplete"; missing: PublishRequirement[] }
  | { status: "error"; message: string };

export const INITIAL_PROPERTY_ACTION_STATE: PropertyActionState = { status: "idle" };

/** Geocoding outcomes the user should be warned about. */
export const geocodeWarning = (geocode: GeocodeStatus): string | null => {
  switch (geocode) {
    case "not_found":
      return "Адресу не знайдено, карти на сторінці не буде";
    case "failed":
      return "Не вдалося визначити координати, карти на сторінці поки не буде. Збережіть ще раз пізніше";
    case "found":
    case "skipped":
      return null;
    default: {
      const unreachable: never = geocode;
      return unreachable;
    }
  }
};

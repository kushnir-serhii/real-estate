import type { AdminListStatus } from "@/lib/db/admin-property-filters";

/** Cover and related-properties editor: types shared by the browser and the server actions (no zod, no server-only). */

export const RELATED_MAX = 3;

/** Result of the cover / related actions. `message` is Ukrainian and ready to show. */
export type PostMediaResult = { ok: true } | { ok: false; message: string };

/** A property in the picker: what the admin needs to recognise it. */
export type PickerProperty = {
  id: string;
  title: string;
  /** Price with currency, already formatted. */
  price: string;
  /** Address line, or null for a fresh draft. */
  address: string | null;
  /** Only `published` ones are shown on the site. */
  status: AdminListStatus;
  /** Thumbnail URL, or null (no photo). */
  thumb: string | null;
};

export type PickerSearchResult = { ok: true; items: PickerProperty[] } | { ok: false; message: string };

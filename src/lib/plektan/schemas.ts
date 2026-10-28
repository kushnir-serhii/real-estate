import { z } from "zod";

/**
 * Lenient response schemas. Plektan's shapes are only partly documented, so:
 * - values that may be a string or `{ value, caption }` are normalized to one value;
 * - numbers may arrive as strings; anything unusable becomes `null` (not an error);
 * - only fields the sync can't live without (ids) are required;
 * - the untouched original object is kept in `raw`.
 */

export type PlektanRaw = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toText = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value)) return toText(value.caption) ?? toText(value.value);
  return null;
};

const toEnumValue = (value: unknown): string | null => {
  if (isRecord(value)) return toText(value.value) ?? toText(value.caption);
  return toText(value);
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/\s/g, "").replace(",", ".");
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return false;
};

const toList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.values(value);
  return [];
};

const toStringList = (value: unknown): string[] =>
  toList(value).flatMap((item) => {
    const text = toText(item);
    return text === null || text === "" ? [] : [text];
  });

// `.optional()` first: a missing key must reach the transform (as undefined), not fail the object.
const lenient = <T>(convert: (value: unknown) => T) => z.unknown().optional().transform(convert);

const textField = lenient(toText);
const enumField = lenient(toEnumValue);
const numberField = lenient(toNumber);
const booleanField = lenient(toBoolean);
const stringListField = lenient(toStringList);

const idField = z.unknown().optional().transform((value, ctx) => {
  const text = toText(value);
  if (text === null || text === "") {
    ctx.addIssue({ code: "custom", message: "missing id" });
    return z.NEVER;
  }
  return text;
});

/** Keeps the original object next to the normalized fields. */
const withRaw = <T extends object>(fields: z.ZodType<T>) =>
  z.record(z.string(), z.unknown()).transform((raw, ctx): T & { raw: PlektanRaw } => {
    const parsed = fields.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
      }
      return z.NEVER;
    }
    return { ...parsed.data, raw };
  });

// ---- price (text fields) ----------------------------------------------------

const priceField = z.unknown().optional().transform((value) => {
  const source = isRecord(value) ? value : { value };
  return {
    value: toText(source.value),
    value_obj: toText(source.value_obj),
    value_m2: toText(source.value_m2),
    value_are: toText(source.value_are),
    kind: toText(source.kind),
    currency_id: toText(source.currency_id),
  };
});

export type PlektanPrice = z.output<typeof priceField>;

// ---- media ------------------------------------------------------------------

/** List: `{ src_small, src_middle, ... }` (an empty PHP array arrives as `[]`). */
const listMediaField = z.unknown().optional().transform((value): Record<string, string> => {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item !== "") out[key] = item;
  }
  return out;
});

/** View: `[{ src, title }]`. */
const viewMediaField = z.unknown().optional().transform((value): { src: string; title: string | null }[] =>
  toList(value).flatMap((item) => {
    const src = typeof item === "string" ? item : isRecord(item) ? toText(item.src) : null;
    if (src === null || src === "") return [];
    return [{ src, title: isRecord(item) ? toText(item.title) : null }];
  }),
);

// ---- listing fields ---------------------------------------------------------

const baseFields = {
  adid: idField,
  date_add: textField,
  date_mod: textField,
  state: textField,
  deal: enumField,
  property: enumField,
  prop_kind: enumField,
  is_mls: booleanField,
  is_newbuilding: booleanField,
  price: priceField,
  base_price: textField,
  discount: textField,
  housing_class: enumField,
  repair: enumField,
  wall_material: enumField,
  storey: numberField,
  storeys: numberField,
  area_total: numberField,
  area_life: numberField,
  area_kitchen: numberField,
  area_lot: numberField,
  room_count: numberField,
  locality: textField,
  district: textField,
  street: textField,
  subway_station: textField,
};

const listItemFields = z.object({ ...baseFields, media: listMediaField });

export const listItemSchema = withRaw(listItemFields);
export type PlektanListItem = z.output<typeof listItemSchema>;

// ---- view -------------------------------------------------------------------

const viewUserFields = z.object({
  user_id: idField,
  name: textField,
  phones: stringListField,
  email: textField,
  url_small: textField,
  site: textField,
  status: textField,
});

const viewUserSchema = withRaw(viewUserFields);
export type PlektanViewUser = z.output<typeof viewUserSchema>;

const viewItemFields = z.object({
  ...baseFields,
  advert_id: textField,
  media: viewMediaField,
  an_fee: textField,
  promo_text: textField,
  housestr: textField,
  orient: textField,
  year_built: numberField,
  developer: textField,
  ceiling_height: numberField,
  bedroom_count: numberField,
  bathroom_count: numberField,
  balcony_count: numberField,
  room_explication: textField,
  users: z
    .array(viewUserSchema)
    .nullish()
    .transform((users) => users ?? []),
});

export const viewItemSchema = withRaw(viewItemFields);
export type PlektanViewItem = z.output<typeof viewItemSchema>;

// ---- contact persons --------------------------------------------------------

const contactPersonFields = z.object({
  user_id: idField,
  name: textField,
  greeting: textField,
  phones: stringListField,
  email: textField,
  url_small: textField,
  site_id: textField,
});

export const contactPersonSchema = withRaw(contactPersonFields);
export type PlektanContactPerson = z.output<typeof contactPersonSchema>;

// ---- districts --------------------------------------------------------------

export type PlektanDistrict = {
  value: string;
  caption: string | null;
  children: PlektanDistrict[];
  raw: PlektanRaw;
};

const districtSchema: z.ZodType<PlektanDistrict, unknown> = z.lazy(() =>
  withRaw(
    z.object({
      value: idField,
      caption: textField,
      children: z.unknown().optional().transform((value, ctx): PlektanDistrict[] => {
        const out: PlektanDistrict[] = [];
        for (const item of toList(value)) {
          const parsed = districtSchema.safeParse(item);
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
            }
            return z.NEVER;
          }
          out.push(parsed.data);
        }
        return out;
      }),
    }),
  ),
);

// ---- responses --------------------------------------------------------------

const unwrapData = (body: unknown): unknown =>
  isRecord(body) && "data" in body ? body.data : body;

export const searchResponseSchema = z
  .object({
    data: z.array(listItemSchema),
    totalRows: numberField,
  })
  .transform(({ data, totalRows }) => ({ data, totalRows: totalRows ?? data.length }));
export type PlektanSearchResponse = z.output<typeof searchResponseSchema>;

/** `view` returns the card itself, or `{ data: card }`. */
export const viewResponseSchema = z.unknown().transform(unwrapData).pipe(viewItemSchema);

/** Persons arrive as an array, `{ data: [...] }` or `{ data: { id: {...} } }`. */
export const contactPersonsResponseSchema = z
  .unknown()
  .transform((body) => toList(unwrapData(body)))
  .pipe(z.array(contactPersonSchema));

export const districtsResponseSchema = z
  .unknown()
  .transform((body) => toList(unwrapData(body)))
  .pipe(z.array(districtSchema));

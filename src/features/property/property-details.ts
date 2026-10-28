import { CONTACTS } from "@/constants/contacts";
import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";
import { toTel } from "@/lib/format/to-tel";
import {
  HOUSING_CLASS_LABELS,
  labelOf,
  PROP_KIND_LABELS,
  PROPERTY_TYPE_LABELS,
  REPAIR_LABELS,
  WALL_MATERIAL_LABELS,
} from "@/features/properties/property-labels";

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export type FactRow = { label: string; value: string };

/** Main price line in the property's own currency; rent shows the period. */
export const priceText = (p: PublishedProperty): string =>
  // Missing currency on a priced row is a data gap: treat it as price on request.
  p.price_amount !== null && p.currency !== null
    ? formatPrice(p.price_amount, p.currency, p.deal)
    : formatPrice(null, "USD");

/** «1 258 $ за м²» for sales, «… за м² / міс» for long rent; null when unknown or for daily rent. */
export const perSquareMeterText = (p: PublishedProperty): string | null => {
  if (p.price_per_m2 === null || p.currency === null || p.price_amount === null) return null;
  switch (p.deal) {
    case "sell":
      return `${formatPrice(p.price_per_m2, p.currency)} за м²`;
    case "rent_long":
      return `${formatPrice(p.price_per_m2, p.currency)} за м² / міс`;
    case "rent_day":
      return null;
    default: {
      const unreachable: never = p.deal;
      return unreachable;
    }
  }
};

const squareMeters = (value: number) => `${numberFormat.format(value)} м²`;

const withValue = (label: string, value: string | null): FactRow | null => (value ? { label, value } : null);

const floorText = (p: PublishedProperty): FactRow | null => {
  if (p.storey !== null) {
    return { label: "Поверх", value: p.storeys !== null ? `${p.storey} з ${p.storeys}` : `${p.storey}` };
  }
  if (p.storeys !== null) return { label: "Поверховість", value: `${p.storeys}` };
  return null;
};

/** Key facts as label/value rows; only rows with a value. */
export const factRows = (p: PublishedProperty): FactRow[] => {
  const isPlot = p.property_type === "plot";
  const rows: (FactRow | null)[] = [
    {
      label: "Тип",
      value: labelOf(PROP_KIND_LABELS, p.prop_kind) ?? PROPERTY_TYPE_LABELS[p.property_type],
    },
    !isPlot && p.room_count !== null ? { label: "Кімнат", value: `${p.room_count}` } : null,
    !isPlot && p.area_total !== null ? { label: "Загальна площа", value: squareMeters(p.area_total) } : null,
    !isPlot && p.area_life !== null ? { label: "Житлова площа", value: squareMeters(p.area_life) } : null,
    !isPlot && p.area_kitchen !== null ? { label: "Кухня", value: squareMeters(p.area_kitchen) } : null,
    p.area_lot !== null ? { label: "Ділянка", value: `${numberFormat.format(p.area_lot)} сот.` } : null,
    isPlot ? null : floorText(p),
    withValue("Ремонт", labelOf(REPAIR_LABELS, p.repair)),
    withValue("Стіни", labelOf(WALL_MATERIAL_LABELS, p.wall_material)),
    withValue("Клас житла", labelOf(HOUSING_CLASS_LABELS, p.housing_class)),
    p.is_newbuilding ? { label: "Новобудова", value: "Так" } : null,
  ];
  return rows.filter((row): row is FactRow => row !== null);
};

/** Short summary for the price card: «2 кімн. · 62 м² · 5 з 16 поверх». */
export const shortFacts = (p: PublishedProperty): string[] => {
  const isPlot = p.property_type === "plot";
  return [
    ...(!isPlot && p.room_count !== null ? [`${p.room_count} кімн.`] : []),
    ...(isPlot
      ? p.area_lot !== null
        ? [`${numberFormat.format(p.area_lot)} сот.`]
        : []
      : p.area_total !== null
        ? [`${numberFormat.format(p.area_total)} м²`]
        : []),
    ...(!isPlot && p.storey !== null
      ? [p.storeys !== null ? `${p.storey} з ${p.storeys} поверх` : `${p.storey} поверх`]
      : []),
  ];
};

const districtText = (district: string) =>
  /р-н|район/i.test(district) ? district : `${district} р-н`;

/** «Київ, Оболонський р-н, просп. Володимира Івасюка» — never the house number. Null when nothing is known. */
export const locationText = (p: PublishedProperty): string | null => {
  const parts = [
    p.locality?.trim(),
    p.district?.trim() ? districtText(p.district.trim()) : undefined,
    p.street?.trim(),
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
};

/** Paragraphs split on blank lines; single line breaks stay inside a paragraph. */
export const descriptionParagraphs = (text: string | null): string[] =>
  (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

const META_DESCRIPTION_LENGTH = 155;

/** Meta description: SEO field, else the start of the text cut on a word, else built from the facts. */
export const metaDescription = (p: PublishedProperty): string => {
  if (p.seo_description?.trim()) return p.seo_description.trim();
  const text = (p.description ?? "").replace(/\s+/g, " ").trim();
  if (text) {
    if (text.length <= META_DESCRIPTION_LENGTH) return text;
    const cut = text.slice(0, META_DESCRIPTION_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
  }
  return [PROPERTY_TYPE_LABELS[p.property_type], ...shortFacts(p), locationText(p), priceText(p)]
    .filter(Boolean)
    .join(", ");
};

export type ContactPhone = { display: string; href: string };

/** The phone to call: the agent's first, else the agency's. */
export const contactPhone = (p: PublishedProperty): ContactPhone => {
  const phone = p.agent?.phones[0];
  return phone ? { display: phone, href: `tel:${toTel(phone)}` } : CONTACTS.phone;
};

/** Anchor of the contact block (agent / agency phones and messengers). */
export const CONTACT_ANCHOR = "kontakt";

/** Anchor of the request form; the «Залишити заявку» CTA and the mobile bar point here. */
export const REQUEST_ANCHOR = "zayavka";

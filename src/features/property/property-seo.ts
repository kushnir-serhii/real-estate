import { BRAND } from "@/constants/brand";
import { PROP_KIND_LABELS, PROPERTY_TYPE_LABELS, labelOf } from "@/features/properties/property-labels";
import { districtText } from "@/features/property/property-details";
import type { PublishedProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/format/format-price";

export type PropertySeoInput = Pick<
  PublishedProperty,
  | "property_type"
  | "prop_kind"
  | "room_count"
  | "area_total"
  | "area_lot"
  | "locality"
  | "district"
  | "deal"
  | "price_amount"
  | "currency"
  | "seo_title"
  | "seo_description"
>;

/** Shape accepted by Next `metadata.title`: plain (the root template adds the brand) or `absolute` (no brand added). */
export type SeoTitle = string | { absolute: string };

/** Longest title that still gets « — Sofiacity» appended by the root template. */
const TITLE_WITH_BRAND_MAX = 60;
const BRAND_SUFFIX = ` — ${BRAND.name}`;
const DESCRIPTION_MAX = 155;
const KIND_LABEL_MAX = 24;

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

// Intl uses non-breaking spaces; plain spaces keep lengths and snippets predictable.
const plain = (text: string) => text.replace(/\s+/g, " ").trim();

// A very long kind label («Квартира в новобудові, що будується») would crowd the title: use the plain type instead.
const typeText = (p: PropertySeoInput) => {
  const kind = labelOf(PROP_KIND_LABELS, p.prop_kind);
  return kind && kind.length <= KIND_LABEL_MAX ? kind : PROPERTY_TYPE_LABELS[p.property_type];
};

const roomsText = (p: PropertySeoInput) =>
  p.property_type !== "plot" && p.room_count !== null ? `${p.room_count}-кімн.` : null;

const areaText = (p: PropertySeoInput) => {
  if (p.property_type === "plot") return p.area_lot !== null ? `${numberFormat.format(p.area_lot)} сот.` : null;
  return p.area_total !== null ? `${numberFormat.format(p.area_total)} м²` : null;
};

const districtPart = (p: PropertySeoInput) => (p.district?.trim() ? districtText(p.district.trim()) : null);

const priceMention = (p: PropertySeoInput) =>
  p.price_amount !== null && p.currency !== null ? plain(formatPrice(p.price_amount, p.currency, p.deal)) : null;

const joinParts = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

/** Title from facts + a price for sales; the brand is added by the root template only when the result fits. */
export const propertySeoTitle = (p: PropertySeoInput): SeoTitle => {
  const manual = p.seo_title?.trim();
  // A custom SEO title already carries the brand: don't run it through the title template.
  if (manual) return { absolute: manual };

  const facts = joinParts([typeText(p), roomsText(p), areaText(p), districtPart(p), p.locality?.trim()]);
  const price = p.deal === "sell" ? priceMention(p) : null;
  const withPrice = price ? `${facts} — ${price}` : facts;

  if (withPrice.length + BRAND_SUFFIX.length <= TITLE_WITH_BRAND_MAX) return withPrice;
  // No room for the brand: drop it, and drop the price too if the title is still too long.
  return { absolute: withPrice.length <= TITLE_WITH_BRAND_MAX ? withPrice : facts };
};

/** Cut on a word boundary, never mid-word; adds an ellipsis only when something was cut. */
const trimOnWord = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
};

/** Closing calls to action, longest first; the longest one that keeps the text within the limit wins. */
const CTA_VARIANTS = [
  `Дивіться фото та характеристики, залиште заявку на безкоштовний перегляд і консультацію фахівця — агентство нерухомості ${BRAND.name}.`,
  `Дивіться фото та характеристики, залиште заявку на перегляд — агентство нерухомості ${BRAND.name}.`,
  `Фото, характеристики та заявка на безкоштовний перегляд — агентство нерухомості ${BRAND.name}.`,
  `Фото, характеристики та заявка на перегляд — агентство ${BRAND.name}.`,
  `Фото, характеристики та заявка на перегляд — ${BRAND.name}.`,
  `${BRAND.name} — агентство нерухомості.`,
];

/** Description from facts + a call to action, aiming at 120–155 chars (very sparse data can fall short: nothing honest to add). */
export const propertySeoDescription = (p: PropertySeoInput): string => {
  const manual = p.seo_description?.trim();
  if (manual) return manual;

  const where = joinParts([districtPart(p), p.locality?.trim()]);
  const head = joinParts([typeText(p), roomsText(p), areaText(p)]);
  const price = priceMention(p);
  const dealWord = p.deal === "sell" ? "Продаж" : p.deal === "rent_long" ? "Оренда" : "Подобова оренда";
  const facts = `${dealWord}: ${head}${where ? ` — ${where}` : ""}.${price ? ` ${price}.` : ""}`;

  const shortest = CTA_VARIANTS[CTA_VARIANTS.length - 1];
  const base = trimOnWord(facts, DESCRIPTION_MAX - shortest.length - 1);
  const cta = CTA_VARIANTS.find((variant) => base.length + 1 + variant.length <= DESCRIPTION_MAX) ?? shortest;
  return `${base} ${cta}`;
};

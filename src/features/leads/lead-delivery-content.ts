import { z } from "zod";

import type { LeadForDelivery } from "@/lib/db/leads";
import type { Database } from "@/lib/supabase/database.types";
import { PROP_KINDS_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/db/property-values";
import type { PlektanAddAdvertParams } from "@/lib/plektan";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/property-labels";

/** Pure builders: what goes to Plektan and to Telegram for a lead. No I/O, no personal data in logs. */

type Enums = Database["public"]["Enums"];

const DEFAULT_SITE_URL = "http://localhost:3000";
/** A general request without a property type is sent as a flat: the most common wish. */
export const DEFAULT_GENERAL_PROPERTY_TYPE = "flat" as const;
const TELEGRAM_FIELD_MAX = 1500;

const similarToSchema = z.object({ slug: z.string(), title: z.string() });
const payloadSchema = z.object({
  deal: z.enum(["buy", "rent"]).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  similar_to: similarToSchema.optional(),
});
type LeadPayload = z.infer<typeof payloadSchema>;

/** Lenient: a malformed payload is treated as empty rather than blocking delivery. */
const readPayload = (payload: unknown): LeadPayload => {
  const parsed = payloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : {};
};

const KIND_LABELS: Record<LeadForDelivery["kind"], string> = {
  property_request: "Заявка на об'єкт",
  general: "Загальна заявка",
  ai: "Заявка від AI-асистента",
};

const DEAL_WISH_LABELS = { buy: "Купити", rent: "Орендувати" } as const;

export const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const truncate = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max)}…` : value);

export const propertyUrl = (slug: string, siteUrl?: string): string => {
  const base = (siteUrl ?? "").trim() || DEFAULT_SITE_URL;
  return `${base.replace(/\/+$/, "")}/catalog/${slug}`;
};

export const adminLeadUrl = (id: string, siteUrl?: string): string => {
  const base = (siteUrl ?? "").trim() || DEFAULT_SITE_URL;
  return `${base.replace(/\/+$/, "")}/admin/leads/${id}`;
};

const link = (url: string, title: string): string =>
  `<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`;

export const buildTelegramText = (lead: LeadForDelivery, siteUrl?: string): string => {
  const payload = readPayload(lead.payload);
  const lines: string[] = [`<b>${escapeHtml(KIND_LABELS[lead.kind])}</b>`];
  lines.push(`Ім'я: ${escapeHtml(lead.name)}`);
  lines.push(`Телефон: ${escapeHtml(lead.phone)}`);
  if (lead.email) lines.push(`Email: ${escapeHtml(lead.email)}`);

  if (lead.property) {
    const { slug, title, source, external_id } = lead.property;
    const number = source === "plektan" && external_id ? ` (№ ${escapeHtml(external_id)})` : "";
    lines.push(`Об'єкт: ${link(propertyUrl(slug, siteUrl), title)}${number}`);
  }

  const wishes = [
    payload.deal ? DEAL_WISH_LABELS[payload.deal] : null,
    payload.property_type ? PROPERTY_TYPE_LABELS[payload.property_type] : null,
  ].filter((part): part is string => part !== null);
  if (wishes.length > 0) lines.push(`Побажання: ${escapeHtml(wishes.join(", "))}`);
  if (payload.similar_to) {
    lines.push(`Схожий на: ${link(propertyUrl(payload.similar_to.slug, siteUrl), payload.similar_to.title)}`);
  }

  if (lead.message) lines.push(`Повідомлення: ${escapeHtml(truncate(lead.message, TELEGRAM_FIELD_MAX))}`);
  if (lead.page_url) lines.push(`Сторінка: ${escapeHtml(truncate(lead.page_url, 500))}`);
  lines.push(`Відкрити в адмінці: ${escapeHtml(adminLeadUrl(lead.id, siteUrl))}`);
  return lines.join("\n");
};

/** Alert after the last failed Plektan attempt (slice 3). Name + phone so the lead is not lost. */
export const buildPlektanAlertText = (lead: Pick<LeadForDelivery, "id" | "name" | "phone">, siteUrl?: string): string =>
  [
    "<b>Заявка не дійшла до Plektan</b>",
    `Ім'я: ${escapeHtml(lead.name)}`,
    `Телефон: ${escapeHtml(lead.phone)}`,
    `Відкрити в адмінці: ${escapeHtml(adminLeadUrl(lead.id, siteUrl))}`,
  ].join("\n");

/** Plektan `advert_info`: plain text. */
export const buildAdvertInfo = (lead: LeadForDelivery, siteUrl?: string): string => {
  const payload = readPayload(lead.payload);
  const lines: string[] = [];
  if (lead.property) {
    const { slug, title, source, external_id } = lead.property;
    const url = propertyUrl(slug, siteUrl);
    lines.push(
      source === "plektan" && external_id
        ? `Цікавить об'єкт №${external_id} ${url}`
        : `Цікавить об'єкт «${title}» ${url}`,
    );
  } else {
    const wishes = [
      payload.deal ? DEAL_WISH_LABELS[payload.deal] : null,
      payload.property_type ? PROPERTY_TYPE_LABELS[payload.property_type] : null,
    ].filter((part): part is string => part !== null);
    if (wishes.length > 0) lines.push(`Побажання: ${wishes.join(", ")}`);
    if (payload.similar_to) {
      lines.push(`Схожий на: «${payload.similar_to.title}» ${propertyUrl(payload.similar_to.slug, siteUrl)}`);
    }
  }
  if (lead.message) lines.push(lead.message);
  return lines.join("\n");
};

const requestDealFor = (deal: Enums["deal"]): "buy" | "hire_long" | "hire_day" => {
  switch (deal) {
    case "sell":
      return "buy";
    case "rent_long":
      return "hire_long";
    case "rent_day":
      return "hire_day";
    default: {
      const unreachable: never = deal;
      return unreachable;
    }
  }
};

/**
 * Quick request («Цікавить об'єкт №…») only for a Plektan property with an email; everything else
 * is a regular buy / hire request. Property request: deal from the property (sell → buy,
 * rent_long → hire_long, rent_day → hire_day), type and kinds from the property's type.
 * General / AI: deal from `payload.deal` (buy | rent → hire_long, default buy), type from
 * `payload.property_type` (default flat).
 */
export const buildPlektanRequest = (lead: LeadForDelivery, siteUrl?: string): PlektanAddAdvertParams => {
  const client = { client_name: lead.name, phone: lead.phone };
  const property = lead.property;

  if (property && lead.email && property.source === "plektan" && property.external_id) {
    return {
      ...client,
      client_email: lead.email,
      like_advert: property.external_id,
      property: property.property_type,
      ...(property.prop_kind ? { prop_kind: [property.prop_kind] } : {}),
    };
  }

  const payload = readPayload(lead.payload);
  const propertyType = property ? property.property_type : (payload.property_type ?? DEFAULT_GENERAL_PROPERTY_TYPE);
  const deal = property ? requestDealFor(property.deal) : payload.deal === "rent" ? "hire_long" : "buy";
  return {
    ...client,
    ...(lead.email ? { client_email: lead.email } : {}),
    deal,
    property: propertyType,
    prop_kind: PROP_KINDS_BY_PROPERTY[propertyType],
    advert_info: buildAdvertInfo(lead, siteUrl),
  };
};

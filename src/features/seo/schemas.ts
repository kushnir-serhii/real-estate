/**
 * schema.org builders (pure, tested). Google has no real-estate rich result: this markup is for entity
 * understanding (who the agency is, what a listing is, where the page sits), not for rich snippets.
 */
import { BRAND, OG_DEFAULT_IMAGE } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";
import { districtText } from "@/features/property/property-details";
import type { PublishedProperty } from "@/lib/db/properties";

export type JsonLdObject = Record<string, unknown>;

const SCHEMA_CONTEXT = "https://schema.org";

const toAbsolute = (siteUrl: string, pathOrUrl: string): string => new URL(pathOrUrl, `${siteUrl}/`).toString();

/** «м. Київ, вул. Хрещатик, 10» → locality «Київ», street «вул. Хрещатик, 10». Unrecognised text stays whole in the street. */
export const parseAddress = (address: string): { locality?: string; street: string } => {
  const [first, ...rest] = address.split(",").map((part) => part.trim());
  const city = /^м\.\s*(.+)$/.exec(first ?? "");
  if (city && rest.length > 0) return { locality: city[1], street: rest.join(", ") };
  return { street: address.trim() };
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Only the plain «щодня 9:00–19:00» form is understood; any other free text is left out rather than guessed. */
const openingHours = (hours: string): JsonLdObject | null => {
  const match = /^щодня\s+(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})$/i.exec(hours.trim());
  if (!match) return null;
  const pad = (time: string) => time.padStart(5, "0");
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: DAYS,
    opens: pad(match[1]),
    closes: pad(match[2]),
  };
};

/** Agency entity for the whole site, from the same BRAND / CONTACTS constants as the footer (same NAP). */
export const organizationSchema = (siteUrl: string): JsonLdObject => {
  const { locality, street } = parseAddress(CONTACTS.address);
  const hours = openingHours(CONTACTS.hours);
  const profileUrls: string[] = [
    ...Object.values(CONTACTS.socials).map((social) => social.url),
    ...(CONTACTS.messengers.telegram.enabled ? [CONTACTS.messengers.telegram.url] : []),
  ];
  const sameAs = profileUrls.filter((url) => /^https?:\/\//.test(url));
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": ["Organization", "RealEstateAgent"],
    "@id": `${siteUrl}/#organization`,
    name: BRAND.name,
    url: siteUrl,
    // Placeholder image until the real logo exists (see OG_DEFAULT_IMAGE).
    logo: toAbsolute(siteUrl, OG_DEFAULT_IMAGE.url),
    image: toAbsolute(siteUrl, OG_DEFAULT_IMAGE.url),
    description: BRAND.siteDescription,
    telephone: CONTACTS.phone.display,
    email: CONTACTS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      ...(locality ? { addressLocality: locality } : {}),
      addressCountry: "UA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CONTACTS.coordinates.lat,
      longitude: CONTACTS.coordinates.lng,
    },
    ...(hours ? { openingHoursSpecification: hours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
};

export type BreadcrumbItem = { name: string; path: string };

/** `BreadcrumbList`; every item gets an absolute URL. */
export const breadcrumbSchema = (siteUrl: string, items: BreadcrumbItem[]): JsonLdObject => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: toAbsolute(siteUrl, item.path),
  })),
});

export const HOME_CRUMB: BreadcrumbItem = { name: "Головна", path: "/" };
export const CATALOG_CRUMB: BreadcrumbItem = { name: "Каталог", path: "/catalog" };

export type SchemaProperty = Pick<
  PublishedProperty,
  | "slug"
  | "title"
  | "description"
  | "property_type"
  | "room_count"
  | "area_total"
  | "area_lot"
  | "locality"
  | "district"
  | "deal"
  | "price_amount"
  | "currency"
  | "updated_at"
  | "status"
>;

/**
 * Most specific honest type: flat → Apartment, house → House; commercial premises and plots have no good
 * residential type, so they stay a plain `Place` (a plot is not a `Landform`, which means natural terrain).
 */
const placeType = (type: SchemaProperty["property_type"]): string => {
  switch (type) {
    case "flat":
      return "Apartment";
    case "house":
      return "House";
    case "commercial":
    case "plot":
      return "Place";
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
};

const RENT_UNIT_CODE = { rent_long: "MON", rent_day: "DAY" } as const;

/**
 * `RealEstateListing` for a published property, or null for anything else (sold / hidden pages get no listing and no Offer).
 * Address stops at the district: no street, no house number. `imageUrls` are already public URLs (absolute or site-relative).
 */
export const propertySchema = (siteUrl: string, p: SchemaProperty, imageUrls: string[]): JsonLdObject | null => {
  if (p.status !== "published") return null;
  const url = toAbsolute(siteUrl, `/catalog/${p.slug}`);
  const images = imageUrls.map((image) => toAbsolute(siteUrl, image));
  const isPlot = p.property_type === "plot";
  const floorArea = isPlot ? p.area_lot : p.area_total;
  const hasAddress = Boolean(p.locality?.trim() || p.district?.trim());

  const mainEntity: JsonLdObject = {
    "@type": placeType(p.property_type),
    name: p.title,
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            ...(p.locality?.trim() ? { addressLocality: p.locality.trim() } : {}),
            ...(p.district?.trim() ? { addressRegion: districtText(p.district.trim()) } : {}),
            addressCountry: "UA",
          },
        }
      : {}),
    // Plot area is in sotky (100 m²), so it is not a floor size.
    ...(!isPlot && floorArea !== null ? { floorSize: { "@type": "QuantitativeValue", value: floorArea, unitCode: "MTK" } } : {}),
    ...(p.property_type !== "plot" && p.room_count !== null ? { numberOfRooms: p.room_count } : {}),
  };

  const priced = p.price_amount !== null && p.currency !== null;
  const rentUnit = p.deal === "sell" ? null : RENT_UNIT_CODE[p.deal];
  const offer: JsonLdObject | null = priced
    ? {
        "@type": "Offer",
        url,
        price: p.price_amount,
        priceCurrency: p.currency,
        availability: "https://schema.org/InStock",
        ...(rentUnit
          ? {
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: p.price_amount,
                priceCurrency: p.currency,
                unitCode: rentUnit,
              },
            }
          : {}),
      }
    : null;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    url,
    name: p.title,
    ...(p.description?.trim() ? { description: p.description.trim().slice(0, 500) } : {}),
    dateModified: p.updated_at,
    ...(images.length ? { image: images } : {}),
    mainEntity,
    ...(offer ? { offers: offer } : {}),
  };
};

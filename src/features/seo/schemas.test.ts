import { describe, expect, it } from "vitest";

import { BRAND } from "@/constants/brand";
import { CONTACTS } from "@/constants/contacts";
import { breadcrumbSchema, organizationSchema, parseAddress, propertySchema } from "./schemas";
import type { SchemaProperty } from "./schemas";

const SITE = "https://example.test";

const flat: SchemaProperty = {
  slug: "2-kimnatna-123abc",
  title: "2-кімнатна квартира",
  description: "Світла квартира",
  property_type: "flat",
  room_count: 2,
  area_total: 62,
  area_lot: null,
  locality: "Київ",
  district: "Оболонський",
  deal: "sell",
  price_amount: 85000,
  currency: "USD",
  updated_at: "2026-10-01T10:00:00.000Z",
  status: "published",
};

describe("organizationSchema", () => {
  const org = organizationSchema(SITE);

  it("is an Organization and a RealEstateAgent built from BRAND / CONTACTS", () => {
    expect(org["@type"]).toEqual(["Organization", "RealEstateAgent"]);
    expect(org.name).toBe(BRAND.name);
    expect(org.telephone).toBe(CONTACTS.phone.display);
    expect(org.email).toBe(CONTACTS.email);
    expect(org.url).toBe(SITE);
    expect(org.logo).toBe(`${SITE}/og-default.png`);
  });

  it("splits the address and understands daily hours", () => {
    expect(org.address).toMatchObject({ addressLocality: "Київ", streetAddress: "вул. Хрещатик, 10", addressCountry: "UA" });
    expect(org.openingHoursSpecification).toMatchObject({ opens: "09:00", closes: "19:00" });
  });
});

describe("parseAddress", () => {
  it("keeps unrecognised text whole", () => {
    expect(parseAddress("Хрещатик 10")).toEqual({ street: "Хрещатик 10" });
  });
});

describe("breadcrumbSchema", () => {
  it("numbers items and makes URLs absolute", () => {
    const list = breadcrumbSchema(SITE, [
      { name: "Головна", path: "/" },
      { name: "Каталог", path: "/catalog" },
    ]);
    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Головна", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE}/catalog` },
    ]);
  });
});

describe("propertySchema", () => {
  it("builds a listing with a numeric price and a district-level address", () => {
    const schema = propertySchema(SITE, flat, ["/r2-local/a.jpg", "https://cdn.test/b.jpg"]);
    expect(schema).toMatchObject({
      "@type": "RealEstateListing",
      url: `${SITE}/catalog/${flat.slug}`,
      image: [`${SITE}/r2-local/a.jpg`, "https://cdn.test/b.jpg"],
      mainEntity: {
        "@type": "Apartment",
        numberOfRooms: 2,
        floorSize: { value: 62, unitCode: "MTK" },
        address: { addressLocality: "Київ", addressRegion: "Оболонський р-н" },
      },
      offers: { "@type": "Offer", price: 85000, priceCurrency: "USD", availability: "https://schema.org/InStock" },
    });
  });

  it("never includes a street or house number", () => {
    const json = JSON.stringify(propertySchema(SITE, { ...flat, street: "вул. Секретна", house: "15" } as SchemaProperty, []));
    expect(json).not.toContain("streetAddress");
    expect(json).not.toContain("Секретна");
    expect(json).not.toContain("15\"");
  });

  it("gives no listing and no Offer for sold or hidden properties", () => {
    expect(propertySchema(SITE, { ...flat, status: "hidden" }, [])).toBeNull();
  });

  it("omits the Offer when the price is unknown and marks rent periods", () => {
    expect(propertySchema(SITE, { ...flat, price_amount: null, currency: null }, [])).not.toHaveProperty("offers");
    const rent = propertySchema(SITE, { ...flat, deal: "rent_long", currency: "UAH" }, []);
    expect(rent?.offers).toMatchObject({ priceSpecification: { unitCode: "MON" } });
  });

  it("uses Place for plots and no floor size or rooms", () => {
    const plot = propertySchema(SITE, { ...flat, property_type: "plot", room_count: null, area_total: null, area_lot: 12 }, []);
    expect(plot?.mainEntity).toMatchObject({ "@type": "Place" });
    expect(plot?.mainEntity).not.toHaveProperty("floorSize");
  });
});

import { describe, expect, it } from "vitest";

import type { LeadForDelivery } from "@/lib/db/leads";
import { PROP_KINDS_BY_PROPERTY } from "@/lib/db/property-values";
import { buildAdvertInfo, buildPlektanAlertText, buildPlektanRequest, buildTelegramText, escapeHtml } from "./lead-delivery-content";

const SITE = "https://lyndrik.example/";

const plektanProperty = {
  slug: "kvartira-1",
  title: "2-кімнатна <Центр>",
  source: "plektan" as const,
  external_id: "12345",
  deal: "sell" as const,
  property_type: "flat" as const,
  prop_kind: "isolated",
};

const lead = (over: Partial<LeadForDelivery> = {}): LeadForDelivery => ({
  id: "l1",
  kind: "property_request",
  name: "Іван",
  phone: "+380501234567",
  email: null,
  message: null,
  payload: null,
  page_url: null,
  plektan_status: "pending",
  plektan_attempts: 0,
  telegram_status: "pending",
  telegram_attempts: 0,
  property: plektanProperty,
  ...over,
});

describe("buildPlektanRequest", () => {
  it("sends a quick request for a Plektan property with an email", () => {
    const params = buildPlektanRequest(lead({ email: "a@b.ua" }), SITE);
    expect(params).toMatchObject({ like_advert: "12345", client_email: "a@b.ua", phone: "+380501234567", property: "flat" });
    expect(params).not.toHaveProperty("deal");
  });

  it("sends a regular buy request without an email", () => {
    const params = buildPlektanRequest(lead({ message: "Передзвоніть" }), SITE);
    expect(params).toMatchObject({ deal: "buy", property: "flat", prop_kind: PROP_KINDS_BY_PROPERTY.flat });
    expect(params).not.toHaveProperty("client_email");
    expect(params).toHaveProperty(
      "advert_info",
      "Цікавить об'єкт №12345 https://lyndrik.example/catalog/kvartira-1\nПередзвоніть",
    );
  });

  it("maps rent deals and sends a regular request for an admin property even with an email", () => {
    const admin = {
      ...plektanProperty,
      source: "admin" as const,
      external_id: null,
      deal: "rent_long" as const,
      property_type: "house" as const,
    };
    const params = buildPlektanRequest(lead({ email: "a@b.ua", property: admin }), SITE);
    expect(params).toMatchObject({
      deal: "hire_long",
      property: "house",
      client_email: "a@b.ua",
      prop_kind: PROP_KINDS_BY_PROPERTY.house,
    });
    expect(params).not.toHaveProperty("like_advert");
    expect(buildAdvertInfo(lead({ property: admin }), SITE)).toContain("«2-кімнатна <Центр>»");
  });

  it("builds a general request from the payload", () => {
    const params = buildPlektanRequest(
      lead({ kind: "general", property: null, payload: { deal: "rent", property_type: "commercial" } }),
      SITE,
    );
    expect(params).toMatchObject({ deal: "hire_long", property: "commercial" });
  });

  it("defaults a general request without a type to a flat to buy", () => {
    const params = buildPlektanRequest(lead({ kind: "general", property: null, payload: { deal: "buy" } }), SITE);
    expect(params).toMatchObject({ deal: "buy", property: "flat", prop_kind: PROP_KINDS_BY_PROPERTY.flat });
  });

  it("survives a malformed payload", () => {
    const params = buildPlektanRequest(lead({ kind: "general", property: null, payload: "oops" }), SITE);
    expect(params).toMatchObject({ deal: "buy", property: "flat" });
  });
});

describe("buildTelegramText", () => {
  it("escapes HTML and links the property with the Plektan number", () => {
    const text = buildTelegramText(
      lead({ name: "<b>Hack</b> & co", message: "a < b", email: "a@b.ua", page_url: "https://x.ua/?a=1&b=2" }),
      SITE,
    );
    expect(text).toContain("<b>Заявка на об'єкт</b>");
    expect(text).toContain("Ім'я: &lt;b&gt;Hack&lt;/b&gt; &amp; co");
    expect(text).toContain("Повідомлення: a &lt; b");
    expect(text).toContain("Сторінка: https://x.ua/?a=1&amp;b=2");
    expect(text).toContain('<a href="https://lyndrik.example/catalog/kvartira-1">2-кімнатна &lt;Центр&gt;</a> (№ 12345)');
  });

  it("ends with the admin link to the lead", () => {
    const text = buildTelegramText(lead({ id: "abc-1" }), SITE);
    expect(text.split("\n").at(-1)).toBe("Відкрити в адмінці: https://lyndrik.example/admin/leads/abc-1");
  });

  it("omits the number for an admin property", () => {
    const text = buildTelegramText(lead({ property: { ...plektanProperty, source: "admin", external_id: null } }), SITE);
    expect(text).not.toContain("№");
  });

  it("shows wishes and the similar property of a general request, default site url", () => {
    const text = buildTelegramText(
      lead({
        kind: "general",
        property: null,
        payload: { deal: "rent", property_type: "flat", similar_to: { id: "x", slug: "sold-1", title: "Продана" } },
      }),
    );
    expect(text).toContain("<b>Загальна заявка</b>");
    expect(text).toContain("Побажання: Орендувати, Квартира");
    expect(text).toContain('Схожий на: <a href="http://localhost:3000/catalog/sold-1">Продана</a>');
  });

  it("labels AI leads", () => {
    expect(buildTelegramText(lead({ kind: "ai", property: null }))).toContain("Заявка від AI-асистента");
  });
});

describe("buildPlektanAlertText", () => {
  it("has name, phone and the admin link", () => {
    const text = buildPlektanAlertText({ id: "abc-1", name: "Іван", phone: "+380501234567" }, SITE);
    expect(text).toContain("Заявка не дійшла до Plektan");
    expect(text.split("\n").at(-1)).toBe("Відкрити в адмінці: https://lyndrik.example/admin/leads/abc-1");
  });
});

describe("escapeHtml", () => {
  it("escapes the four special characters", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});

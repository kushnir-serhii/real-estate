import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PAGES } from "@/constants/pages";
import type { PropertyFormValues } from "@/features/admin/properties/property-form-schema";
import { demoPropertiesDriver } from "@/lib/demo/db/properties";
import { checkDemoUploadCaps, getDemoObject, putDemoObject } from "@/lib/demo/photos";
import { resetDemoData } from "@/lib/demo/reset";
import { getDemoStore } from "@/lib/demo/store";
import { DEMO_UPLOAD_PREFIX } from "@/lib/photos/photo-keys";
import { photoUrl } from "@/lib/photos/photo-url";
import { getAdminLead, getAdminLeads, parseAdminLeadFilters } from "./admin-leads";
import { getAdminPage, listAdminPages, resetAdminPage, saveAdminPage } from "./admin-pages";
import { parseAdminPropertyFilters } from "./admin-property-filters";
import {
  createAdminProperty,
  deleteAdminDraft,
  getActiveAgents,
  getAdminProperties,
  getAdminProperty,
  getSourceSwitchSummary,
  hideAdminProperty,
  publishAdminProperty,
  saveExchangeRates,
  setPropertiesSource,
  updateAdminProperty,
  updateAdminPropertySeo,
} from "./admin-properties";
import { appendPhoto, countPhotos, deletePropertyPhoto, reorderPropertyPhotos } from "./admin-property-photos";
import { getSettings } from "./settings";

/** The demo side of the admin data modules (spec 011 slice 3): CRUD, filters, FK actions and the upload caps. */

const MB = 1024 * 1024;

const values = (overrides: Partial<PropertyFormValues> = {}): PropertyFormValues => ({
  deal: "sell",
  property_type: "flat",
  prop_kind: null,
  title: "Тестова квартира для демо",
  price_amount: 100_000,
  currency: "USD",
  area_total: 50,
  area_life: null,
  area_kitchen: null,
  area_lot: null,
  room_count: 2,
  storey: null,
  storeys: null,
  repair: null,
  wall_material: null,
  housing_class: null,
  is_newbuilding: false,
  locality: "Київ",
  district: "Оболонь",
  street: null,
  house: null,
  description: null,
  agent_id: null,
  seo_title: null,
  seo_description: null,
  ...overrides,
});

const create = async (overrides: Partial<PropertyFormValues> = {}) => {
  const result = await createAdminProperty(values(overrides));
  if (!result.ok) throw new Error("create failed");
  return result;
};

describe("demo admin drivers", () => {
  beforeAll(() => {
    vi.stubEnv("DATA_DRIVER", "demo");
    vi.stubEnv("DEMO_UPLOAD_MAX_MB", "");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    resetDemoData();
  });

  describe("leads", () => {
    it("lists newest first, filters by kind / failed / digits, and paginates with the real total", async () => {
      const all = await getAdminLeads(parseAdminLeadFilters({}));
      expect(all.total).toBe(getDemoStore().leads.length);
      const dates = all.items.map((lead) => Date.parse(lead.created_at));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));

      const ai = await getAdminLeads(parseAdminLeadFilters({ kind: "ai" }));
      expect(ai.total).toBeGreaterThan(0);
      expect(ai.items.every((lead) => lead.kind === "ai")).toBe(true);

      const failed = await getAdminLeads(parseAdminLeadFilters({ failed: "1" }));
      expect(failed.total).toBeGreaterThan(0);
      expect(failed.total).toBeLessThan(all.total);

      const byPhone = await getAdminLeads(parseAdminLeadFilters({ q: "000 00 01" }));
      expect(byPhone.items.map((lead) => lead.phone)).toContain("+380 00 000 00 01");

      const past = await getAdminLeads(parseAdminLeadFilters({ page: "9" }));
      expect(past.items).toEqual([]);
      expect(past.total).toBe(all.total);
    });

    it("returns the detail with the property and null for an unknown id", async () => {
      const withProperty = getDemoStore().leads.find((lead) => lead.property_id !== null);
      if (!withProperty) throw new Error("seed has no lead with a property");
      const detail = await getAdminLead(withProperty.id);
      expect(detail?.property?.slug).toBeTruthy();
      expect(await getAdminLead(crypto.randomUUID())).toBeNull();
      expect(await getAdminLead("not-a-uuid")).toBeNull();
    });
  });

  describe("properties", () => {
    it("creates a draft, publishes it, shows it publicly, hides it and refuses to delete a published one", async () => {
      const { id, slug } = await create();
      const draft = await getAdminProperty(id);
      expect(draft).toMatchObject({ source: "admin", status: "hidden", published_at: null, price_usd: 100_000, price_per_m2: 2000 });
      expect(await demoPropertiesDriver.fetchPropertyBySlug(slug)).toBeNull();

      expect(await publishAdminProperty(id)).toEqual({ ok: true, slug });
      expect((await getAdminProperty(id))?.status).toBe("published");
      expect((await demoPropertiesDriver.fetchPropertyBySlug(slug))?.kind).toBe("published");

      expect(await hideAdminProperty(id)).toEqual({ ok: true, slug });
      const hidden = await getAdminProperty(id);
      expect(hidden?.status).toBe("hidden");
      expect(hidden?.hidden_at).not.toBeNull();

      expect(await deleteAdminDraft(id)).toEqual({ ok: false, reason: "published" });
    });

    it("refuses to publish an incomplete property", async () => {
      const { id } = await create({ locality: null });
      const result = await publishAdminProperty(id);
      expect(result.ok).toBe(false);
    });

    it("updates fields, keeps the slug after the first publish and updates SEO", async () => {
      const { id, slug } = await create();
      const first = await getAdminProperty(id);
      if (!first) throw new Error("missing");
      const renamed = await updateAdminProperty(id, values({ title: "Нова назва до публікації" }), first);
      expect(renamed.ok && renamed.slug).not.toBe(slug);
      await publishAdminProperty(id);
      const published = await getAdminProperty(id);
      if (!published) throw new Error("missing");
      const again = await updateAdminProperty(id, values({ title: "Ще одна назва після публікації" }), published);
      expect(again.ok && again.slug).toBe(published.slug);
      expect(await updateAdminPropertySeo(id, { seo_title: "SEO", seo_description: null })).toMatchObject({ ok: true });
      expect((await getAdminProperty(id))?.seo_title).toBe("SEO");
      expect(await updateAdminProperty(crypto.randomUUID(), values(), published)).toEqual({ ok: false, reason: "not_found" });
    });

    it("rejects an unknown agent and lists active agents only", async () => {
      expect(await createAdminProperty(values({ agent_id: crypto.randomUUID() }))).toEqual({ ok: false, reason: "agent_not_found" });
      const agents = await getActiveAgents();
      expect(agents.length).toBeGreaterThan(0);
      const active = new Set(getDemoStore().agents.filter((agent) => agent.is_active).map((agent) => agent.id));
      expect(agents.every((agent) => active.has(agent.id))).toBe(true);
    });

    it("filters the admin list by status, source and search", async () => {
      const { id } = await create({ title: "Унікальний пошуковий запис" });
      const drafts = await getAdminProperties(parseAdminPropertyFilters({ status: "draft" }));
      expect(drafts.items.map((item) => item.id)).toContain(id);
      const search = await getAdminProperties(parseAdminPropertyFilters({ q: "унікальний пошуковий" }));
      expect(search.items.map((item) => item.id)).toEqual([id]);
      expect(search.items[0]?.listStatus).toBe("draft");
      const plektan = await getAdminProperties(parseAdminPropertyFilters({ source: "plektan" }));
      expect(plektan.items.every((item) => item.source === "plektan")).toBe(true);
    });

    it("deleting a draft clears property_id on leads and conversations and removes photos and their bytes", async () => {
      const { id } = await create();
      const store = getDemoStore();
      const leadId = crypto.randomUUID();
      store.leads.push({ ...store.leads[0], id: leadId, client_request_id: crypto.randomUUID(), property_id: id });
      const conversationId = crypto.randomUUID();
      store.ai_conversations.push({ ...store.ai_conversations[0], id: conversationId, property_id: id });

      const key = `${DEMO_UPLOAD_PREFIX}properties/${id}/abc-960.webp`;
      putDemoObject(key, new Uint8Array([1, 2, 3]), "image/webp");
      await appendPhoto(id, { r2_key: key, sizes: { "960": key }, width: 960, height: 640 });

      expect(await deleteAdminDraft(id)).toMatchObject({ ok: true });
      expect(await getAdminProperty(id)).toBeNull();
      expect(store.property_photos.some((photo) => photo.property_id === id)).toBe(false);
      expect(getDemoObject(key)).toBeNull();
      expect(store.leads.find((row) => row.id === leadId)?.property_id).toBeNull();
      expect(store.ai_conversations.find((row) => row.id === conversationId)?.property_id).toBeNull();
      expect(await deleteAdminDraft(id)).toEqual({ ok: false, reason: "not_found" });
    });

    it("saves exchange rates and recomputes price_usd; switches the source and counts", async () => {
      const { id } = await create({ currency: "UAH", price_amount: 4_150_000 });
      expect((await getAdminProperty(id))?.price_usd).toBe(100_000);
      const result = await saveExchangeRates({ UAH: 40, EUR: 0.9 });
      expect(result.recomputed).toBeGreaterThan(0);
      expect((await getAdminProperty(id))?.price_usd).toBe(103_750);
      expect((await getSettings()).exchange_rates).toEqual({ UAH: 40, EUR: 0.9 });
      await expect(saveExchangeRates({ UAH: 0, EUR: 1 })).rejects.toThrow();

      await setPropertiesSource("plektan");
      const summary = await getSourceSwitchSummary();
      expect(summary.mode).toBe("plektan");
      expect(summary.admin.total).toBeGreaterThan(0);
      expect(summary.plektan.published).toBeGreaterThan(0);
    });
  });

  describe("photos", () => {
    const upload = async (propertyId: string, token: string) => {
      const key = `${DEMO_UPLOAD_PREFIX}properties/${propertyId}/${token}-960.webp`;
      putDemoObject(key, new Uint8Array([1, 2, 3]), "image/webp");
      return appendPhoto(propertyId, { r2_key: key, sizes: { "960": key }, width: 960, height: 640 });
    };

    it("appends at the end, reorders (cover = 0) and compacts after a delete", async () => {
      const { id } = await create();
      const a = await upload(id, "aaa");
      const b = await upload(id, "bbb");
      const c = await upload(id, "ccc");
      expect([a.position, b.position, c.position]).toEqual([0, 1, 2]);
      expect(await countPhotos(id)).toBe(3);

      expect(await reorderPropertyPhotos(id, [c.id, a.id, b.id])).toEqual({ ok: true });
      expect((await getAdminProperty(id))?.photos.map((photo) => photo.id)).toEqual([c.id, a.id, b.id]);
      expect(await reorderPropertyPhotos(id, [c.id, a.id])).toEqual({ ok: false, reason: "mismatch" });

      expect(await deletePropertyPhoto(id, c.id)).toEqual({ ok: true });
      const left = (await getAdminProperty(id))?.photos ?? [];
      expect(left.map((photo) => [photo.id, photo.position])).toEqual([
        [a.id, 0],
        [b.id, 1],
      ]);
      expect(getDemoObject(c.r2_key)).toBeNull();
      expect(getDemoObject(a.r2_key)).not.toBeNull();
      expect(await deletePropertyPhoto(id, c.id)).toEqual({ ok: false, reason: "mismatch" });
    });

    it("points photoUrl at the demo route for uploads and keeps seed placeholders in public/", () => {
      expect(photoUrl("demo-uploads/properties/x/abc-960.webp")).toBe("/api/demo/photos/properties/x/abc-960.webp");
      expect(photoUrl("placeholders/flat-living-1.webp")).toBe("/placeholders/flat-living-1.webp");
    });

    it("enforces the per-photo and total caps; DEMO_UPLOAD_MAX_MB changes them; reset clears uploads", () => {
      expect(checkDemoUploadCaps(2 * MB).ok).toBe(true);
      const over = checkDemoUploadCaps(2 * MB + 1);
      expect(over.ok).toBe(false);
      if (!over.ok) expect(over.message).toContain("2 МБ");

      for (let i = 0; i < 20; i += 1) putDemoObject(`${DEMO_UPLOAD_PREFIX}fill/${i}.webp`, new Uint8Array(2 * MB), "image/webp");
      const full = checkDemoUploadCaps(1);
      expect(full.ok).toBe(false);
      if (!full.ok) expect(full.message).toContain("40 МБ");

      resetDemoData();
      expect(getDemoObject(`${DEMO_UPLOAD_PREFIX}fill/0.webp`)).toBeNull();
      expect(checkDemoUploadCaps(2 * MB).ok).toBe(true);

      vi.stubEnv("DEMO_UPLOAD_MAX_MB", "5");
      expect(checkDemoUploadCaps(4 * MB).ok).toBe(true);
      expect(checkDemoUploadCaps(6 * MB).ok).toBe(false);
      vi.stubEnv("DEMO_UPLOAD_MAX_MB", "");
    });
  });

  describe("pages", () => {
    it("shows the seeded row, returns to the default on reset, then saves a custom page", async () => {
      expect((await getAdminPage("about")).state).toBe("custom");
      await resetAdminPage("about");
      expect((await getAdminPage("about")).state).toBe("default");
      const content = { ...DEFAULT_PAGES.about, title: "Своя назва" };
      await saveAdminPage("about", content);
      expect(await getAdminPage("about")).toMatchObject({ state: "custom", content: { title: "Своя назва" } });
      expect((await listAdminPages()).find((page) => page.slug === "about")).toMatchObject({ state: "custom", title: "Своя назва" });
      await saveAdminPage("about", { ...content, title: "Ще раз" });
      expect((await getAdminPage("about")).content.title).toBe("Ще раз");
      await resetAdminPage("about");
      expect((await getAdminPage("about")).state).toBe("default");
    });
  });

  it("reset restores the seed", async () => {
    const before = getDemoStore().properties.length;
    await create();
    expect(getDemoStore().properties.length).toBe(before + 1);
    const { slugs } = resetDemoData();
    expect(getDemoStore().properties.length).toBe(before);
    expect(slugs.length).toBeGreaterThanOrEqual(before + 1);
  });
});

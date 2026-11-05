import { beforeAll, describe, expect, it } from "vitest";
import { getDemoStore, resetDemoStore } from "@/lib/demo/store";
import { demoAgentsDriver } from "@/lib/demo/db/agents";
import { demoPagesDriver } from "@/lib/demo/db/pages";
import { demoPostsDriver } from "@/lib/demo/db/posts";
import { demoPropertiesDriver } from "@/lib/demo/db/properties";
import { demoSettingsDriver } from "@/lib/demo/db/settings";
import { buildDemoSeed } from "@/lib/demo/seed";
import type { Database } from "@/lib/supabase/database.types";
import type { AgentsDriver, PagesDriver, PostsDriver, PropertiesDriver, SettingsDriver } from "./driver-types";
import { BLOG_PAGE_SIZE, BLOG_RELATED_MAX } from "@/constants/blog";
import { PAGE_SIZE, propertyFiltersSchema } from "./property-query";
import type { PropertyFiltersInput } from "./property-query";

/**
 * Contract tests for the public reads: the same cases run against the demo driver (always) and the Supabase
 * driver (only when a local database with supabase/seed.sql is reachable; skipped otherwise).
 * The oracle is the demo seed itself, filtered here with plain predicates.
 */

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

type Drivers = {
  properties: PropertiesDriver;
  pages: PagesDriver;
  agents: AgentsDriver;
  settings: SettingsDriver;
  posts: PostsDriver;
};

const filters = (input: PropertyFiltersInput = {}) => propertyFiltersSchema.parse(input);

const seedRows = buildDemoSeed(Date.now()).properties;
const published = seedRows.filter((row) => row.status === "published");
const slugsOf = (rows: { slug: string }[]) => rows.map((row) => row.slug).sort();

const allPages = async (driver: PropertiesDriver, input: PropertyFiltersInput) => {
  const first = await driver.fetchPublishedProperties(filters(input));
  const items = [...first.items];
  for (let page = 2; page <= first.pageCount; page++) {
    items.push(...(await driver.fetchPublishedProperties(filters({ ...input, page }))).items);
  }
  return { total: first.total, items };
};

const nullsLast = (values: (number | null)[], ascending: boolean) => {
  const firstNull = values.indexOf(null);
  const present = firstNull === -1 ? values : values.slice(0, firstNull);
  const rest = firstNull === -1 ? [] : values.slice(firstNull);
  expect(rest.every((v) => v === null)).toBe(true);
  for (let i = 1; i < present.length; i++) {
    const prev = present[i - 1] as number;
    const next = present[i] as number;
    expect(ascending ? prev <= next : prev >= next).toBe(true);
  }
};

const runContract = (name: string, getDrivers: () => Drivers | Promise<Drivers>, skip: boolean) => {
  describe.skipIf(skip)(`public data driver contract: ${name}`, () => {
    let d: Drivers;
    beforeAll(async () => {
      d = await getDrivers();
    });

    describe("published only", () => {
      it("lists exactly the published properties and never exposes private columns", async () => {
        const { total, items } = await allPages(d.properties, {});
        expect(total).toBe(published.length);
        expect(slugsOf(items)).toEqual(slugsOf(published));
        for (const item of items) {
          expect(item.status).toBe("published");
          expect(item).not.toHaveProperty("raw");
          expect(item).not.toHaveProperty("house");
          expect(item).not.toHaveProperty("agent_id");
        }
      });

      it("returns a published property by slug, with photos ordered by position", async () => {
        const slug = "pentkhaus-z-terasoiu-holosiiv-7d02ef";
        const found = await d.properties.fetchPropertyBySlug(slug);
        expect(found?.kind).toBe("published");
        const positions = found?.property.property_photos.map((p) => p.position) ?? [];
        expect(positions.length).toBeGreaterThan(1);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
      });

      it("never returns a draft, and an unknown slug is null", async () => {
        expect(await d.properties.fetchPropertyBySlug("2-kimnatna-kvartyra-kyiv-d7a001")).toBeNull();
        expect(await d.properties.fetchPropertyBySlug("no-such-property")).toBeNull();
      });

      it("shows a recently hidden property as sold, outside the list", async () => {
        const found = await d.properties.fetchPropertyBySlug("ofis-na-oboloni-biznes-tsentr-2c49e5");
        expect(found?.kind).toBe("sold");
        const { items } = await allPages(d.properties, {});
        expect(items.map((i) => i.slug)).not.toContain("ofis-na-oboloni-biznes-tsentr-2c49e5");
      });

      it("favourites: published and sold in the given order, unknown ids absent", async () => {
        const byId = (slug: string) => seedRows.find((row) => row.slug === slug)?.id ?? "";
        const ids = [
          byId("ofis-na-oboloni-biznes-tsentr-2c49e5"),
          "00000000-0000-4000-8000-00000000ffff",
          byId("pentkhaus-z-terasoiu-holosiiv-7d02ef"),
          byId("2-kimnatna-kvartyra-kyiv-d7a001"),
        ];
        const result = await d.properties.fetchPropertiesByIds(ids);
        expect(result.map((r) => [r.kind, r.property.slug])).toEqual([
          ["sold", "ofis-na-oboloni-biznes-tsentr-2c49e5"],
          ["published", "pentkhaus-z-terasoiu-holosiiv-7d02ef"],
        ]);
      });

      it("districts: distinct, published only", async () => {
        const expected = [...new Set(published.map((r) => r.district?.trim()).filter((x): x is string => Boolean(x)))];
        const districts = await d.properties.fetchPublishedDistricts();
        expect([...districts].sort()).toEqual([...expected].sort());
        expect(new Set(districts).size).toBe(districts.length);
      });

      it("sitemap: slugs of the published properties only", async () => {
        const rows = await d.properties.fetchSitemapProperties();
        expect(slugsOf(rows)).toEqual(slugsOf(published));
      });
    });

    describe("filters", () => {
      const cases: { name: string; input: PropertyFiltersInput; predicate: (row: PropertyRow) => boolean }[] = [
        { name: "deal", input: { deal: "rent_long" }, predicate: (r) => r.deal === "rent_long" },
        { name: "property type", input: { property_type: "house" }, predicate: (r) => r.property_type === "house" },
        {
          name: "prop kind (several)",
          input: { prop_kind: ["studio", "single"] },
          predicate: (r) => r.prop_kind === "studio" || r.prop_kind === "single",
        },
        {
          name: "rooms exact",
          input: { rooms: ["2", "3"] },
          predicate: (r) => r.room_count === 2 || r.room_count === 3,
        },
        { name: "rooms 5+", input: { rooms: ["5+"] }, predicate: (r) => r.room_count !== null && r.room_count >= 5 },
        {
          name: "rooms exact and 5+",
          input: { rooms: ["1", "5+"] },
          predicate: (r) => r.room_count === 1 || (r.room_count !== null && r.room_count >= 5),
        },
        {
          name: "price range in USD",
          input: { price_usd_from: 50_000, price_usd_to: 150_000 },
          predicate: (r) => r.price_usd !== null && r.price_usd >= 50_000 && r.price_usd <= 150_000,
        },
        {
          name: "price lower bound only",
          input: { price_usd_from: 300_000 },
          predicate: (r) => r.price_usd !== null && r.price_usd >= 300_000,
        },
        {
          name: "area range",
          input: { area_from: 50, area_to: 120 },
          predicate: (r) => r.area_total !== null && r.area_total >= 50 && r.area_total <= 120,
        },
        {
          name: "district (several)",
          input: { district: ["Подільський", "Печерський"] },
          predicate: (r) => r.district === "Подільський" || r.district === "Печерський",
        },
        {
          name: "combined",
          input: { deal: "sell", property_type: "flat", rooms: ["2"], price_usd_to: 100_000 },
          predicate: (r) =>
            r.deal === "sell" &&
            r.property_type === "flat" &&
            r.room_count === 2 &&
            r.price_usd !== null &&
            r.price_usd <= 100_000,
        },
      ];

      it.each(cases)("$name", async ({ input, predicate }) => {
        const expected = published.filter(predicate);
        expect(expected.length).toBeGreaterThan(0);
        const { total, items } = await allPages(d.properties, input);
        expect(total).toBe(expected.length);
        expect(slugsOf(items)).toEqual(slugsOf(expected));
      });

      it("returns nothing for filters that match nothing", async () => {
        const page = await d.properties.fetchPublishedProperties(filters({ deal: "sell", price_usd_to: 1 }));
        expect(page).toMatchObject({ items: [], total: 0, pageCount: 1 });
      });
    });

    describe("sort", () => {
      it("price ascending / descending, unknown prices last", async () => {
        const asc = await allPages(d.properties, { sort: "price_asc" });
        nullsLast(asc.items.map((i) => i.price_usd), true);
        const desc = await allPages(d.properties, { sort: "price_desc" });
        nullsLast(desc.items.map((i) => i.price_usd), false);
        expect(asc.items.some((i) => i.price_usd === null)).toBe(true);
      });

      it("area ascending / descending, unknown areas last", async () => {
        const asc = await allPages(d.properties, { sort: "area_asc" });
        nullsLast(asc.items.map((i) => i.area_total), true);
        const desc = await allPages(d.properties, { sort: "area_desc" });
        nullsLast(desc.items.map((i) => i.area_total), false);
        expect(asc.items.some((i) => i.area_total === null)).toBe(true);
      });

      it("newest first by published_at", async () => {
        const { items } = await allPages(d.properties, { sort: "newest" });
        nullsLast(items.map((i) => (i.published_at === null ? null : Date.parse(i.published_at))), false);
      });

      it("is a stable total order: no duplicates across pages", async () => {
        const { items } = await allPages(d.properties, { sort: "area_asc" });
        expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      });
    });

    describe("pagination", () => {
      it("pages of PAGE_SIZE that add up to the total", async () => {
        const first = await d.properties.fetchPublishedProperties(filters());
        expect(first.items).toHaveLength(PAGE_SIZE);
        expect(first.pageCount).toBe(Math.ceil(published.length / PAGE_SIZE));
        const last = await d.properties.fetchPublishedProperties(filters({ page: first.pageCount }));
        expect(last.items).toHaveLength(published.length - PAGE_SIZE * (first.pageCount - 1));
        expect(last.page).toBe(first.pageCount);
      });

      it("a page past the end is empty but keeps the real total", async () => {
        const beyond = await d.properties.fetchPublishedProperties(filters({ page: 99 }));
        expect(beyond.items).toEqual([]);
        expect(beyond.total).toBe(published.length);
        expect(beyond.page).toBe(99);
      });
    });

    describe("budget currency", () => {
      it("price_usd is the amount in USD, or the amount divided by the rate", async () => {
        const { items } = await allPages(d.properties, {});
        const rates = await d.settings.fetchExchangeRates();
        for (const item of items) {
          if (item.price_amount === null || item.currency === null) {
            expect(item.price_usd).toBeNull();
          } else if (item.currency === "USD") {
            expect(item.price_usd).toBe(item.price_amount);
          } else {
            expect(item.price_usd).toBe(Math.round(item.price_amount / rates[item.currency]));
          }
        }
      });

      it("a USD budget finds listings priced in UAH and EUR", async () => {
        // 2 650 000 UAH ≈ 63 855 USD; 265 000 EUR ≈ 288 043 USD (rates 41.5 / 0.92).
        const uah = await d.properties.fetchPublishedProperties(filters({ price_usd_from: 63_800, price_usd_to: 63_900 }));
        expect(uah.items.map((i) => i.currency)).toEqual(["UAH"]);
        const eur = await d.properties.fetchPublishedProperties(filters({ price_usd_from: 288_000, price_usd_to: 288_100 }));
        expect(eur.items.map((i) => i.currency)).toEqual(["EUR"]);
      });

      it("rates: UAH and EUR per 1 USD", async () => {
        expect(await d.settings.fetchExchangeRates()).toEqual({ UAH: 41.5, EUR: 0.92 });
      });
    });

    describe("similar", () => {
      it("same deal and type, within +-30% price, excluding the target, at most 4", async () => {
        const target = published.find((r) => r.slug === "2-kimnatna-kvartyra-na-oboloni-3f9a1c");
        if (!target) throw new Error("seed changed: target property missing");
        const result = await d.properties.fetchSimilarProperties({
          id: target.id,
          deal: target.deal,
          property_type: target.property_type,
          price_usd: target.price_usd,
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(4);
        for (const item of result) {
          expect(item.id).not.toBe(target.id);
          expect(item.deal).toBe(target.deal);
          expect(item.property_type).toBe(target.property_type);
          expect(item.price_usd).not.toBeNull();
          expect(item.price_usd as number).toBeGreaterThanOrEqual(Math.floor((target.price_usd as number) * 0.7));
          expect(item.price_usd as number).toBeLessThanOrEqual(Math.ceil((target.price_usd as number) * 1.3));
        }
      });
    });

    describe("blog", () => {
      const seedPosts = buildDemoSeed(Date.now()).posts;
      const publishedPosts = seedPosts.filter((post) => post.status === "published");
      const draft = seedPosts.find((post) => post.status === "draft");
      const newestFirst = [...publishedPosts].sort((a, b) => Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""));

      it("lists published posts only, newest first, 6 per page, without the body", async () => {
        const first = await d.posts.fetchPublishedPosts({ page: 1 });
        expect(first.total).toBe(publishedPosts.length);
        expect(first.pageCount).toBe(Math.ceil(publishedPosts.length / BLOG_PAGE_SIZE));
        expect(first.posts).toHaveLength(BLOG_PAGE_SIZE);
        const second = await d.posts.fetchPublishedPosts({ page: 2 });
        const slugs = [...first.posts, ...second.posts].map((post) => post.slug);
        expect(slugs).toEqual(newestFirst.map((post) => post.slug));
        expect(slugs).not.toContain(draft?.slug);
        for (const post of first.posts) {
          expect(post).not.toHaveProperty("body");
          expect(post).not.toHaveProperty("status");
          expect(post).not.toHaveProperty("author_agent_id");
        }
      });

      it("filters by category and returns an empty page past the end with the real total", async () => {
        const market = await d.posts.fetchPublishedPosts({ category: "market", page: 1 });
        const expected = publishedPosts.filter((post) => post.category === "market");
        expect(expected.length).toBeGreaterThan(0);
        expect(market.posts.map((post) => post.slug).sort()).toEqual(expected.map((post) => post.slug).sort());
        const past = await d.posts.fetchPublishedPosts({ page: 9 });
        expect(past).toMatchObject({ posts: [], total: publishedPosts.length });
      });

      it("hides a draft by slug and returns a published post with its author and related properties", async () => {
        expect(draft).toBeDefined();
        expect(await d.posts.fetchPostBySlug(draft?.slug ?? "")).toBeNull();
        expect(await d.posts.fetchPostBySlug("no-such-post")).toBeNull();

        const slug = "yaki-dokumenty-pereviryty-pered-kupivleiu-kvartyry";
        const post = await d.posts.fetchPostBySlug(slug);
        expect(post?.body).toContain("##");
        expect(post).not.toHaveProperty("status");
        expect(post).not.toHaveProperty("author_agent_id");
        expect(post?.author?.name).toBe("Олена Коваленко");
        expect(post?.related.length).toBeGreaterThan(0);
        expect(post?.related.length).toBeLessThanOrEqual(BLOG_RELATED_MAX);
        for (const property of post?.related ?? []) {
          expect(property.status).toBe("published");
          expect(property).not.toHaveProperty("raw");
          expect(property).toHaveProperty("property_photos");
        }
      });

      it("a post without an agent has no author; one without a cover has no cover key", async () => {
        const noAgent = seedPosts.find((post) => post.status === "published" && post.author_agent_id === null);
        const noCover = seedPosts.find((post) => post.status === "published" && post.cover_key === null);
        expect((await d.posts.fetchPostBySlug(noAgent?.slug ?? ""))?.author).toBeNull();
        expect((await d.posts.fetchPostBySlug(noCover?.slug ?? ""))?.cover_key).toBeNull();
      });

      it("returns the latest published posts and the indexable ones for the sitemap", async () => {
        const latest = await d.posts.fetchLatestPosts(3);
        expect(latest.map((post) => post.slug)).toEqual(newestFirst.slice(0, 3).map((post) => post.slug));
        expect(await d.posts.fetchLatestPosts(0)).toEqual([]);
        const sitemap = await d.posts.fetchSitemapPosts();
        expect(sitemap.map((post) => post.slug).sort()).toEqual(
          publishedPosts.filter((post) => !post.noindex).map((post) => post.slug).sort(),
        );
        expect(sitemap.map((post) => post.slug)).not.toContain(draft?.slug);
      });
    });

    describe("agents, pages, settings", () => {
      it("lists active agents only", async () => {
        const names = (await d.agents.fetchActiveAgents()).map((a) => a.name);
        expect(names).toHaveLength(4);
        expect(names).not.toContain("Ірина Савченко");
      });

      it("hides an inactive agent from the property card", async () => {
        const found = await d.properties.fetchPropertyBySlug("3-kimnatna-kvartyra-bohdana-khmelnytskoho-e4a9b6");
        expect(found?.property.agent).toBeNull();
      });

      it("returns a page by slug, null for an unknown one", async () => {
        expect((await d.pages.fetchPage("about"))?.title).toBe("Про агентство");
        expect(await d.pages.fetchPage("no-such-page")).toBeNull();
      });

      it("returns the settings row with typed rates", async () => {
        const settings = await d.settings.fetchSettings();
        expect(settings.exchange_rates).toEqual({ UAH: 41.5, EUR: 0.92 });
      });
    });
  });
};

runContract(
  "demo",
  () => {
    resetDemoStore();
    return {
      properties: demoPropertiesDriver,
      pages: demoPagesDriver,
      agents: demoAgentsDriver,
      settings: demoSettingsDriver,
      posts: demoPostsDriver,
    };
  },
  false,
);

describe("demo store (RLS mirror)", () => {
  beforeAll(() => {
    resetDemoStore();
  });

  it("a property hidden longer ago than the sold window is gone", async () => {
    expect(await demoPropertiesDriver.fetchPropertyBySlug("dilianka-25-sotok-dlia-komertsiinoi-zabudovy-6a03c1")).toBeNull();
  });

  it("the sold window is read from the clock, not from a stale flag", async () => {
    const sold = await demoPropertiesDriver.fetchPropertyBySlug("ofis-na-oboloni-biznes-tsentr-2c49e5");
    expect(sold?.kind).toBe("sold");
    const real = Date.now;
    Date.now = () => real() + 8 * 24 * 60 * 60 * 1000;
    try {
      expect(await demoPropertiesDriver.fetchPropertyBySlug("ofis-na-oboloni-biznes-tsentr-2c49e5")).toBeNull();
    } finally {
      Date.now = real;
    }
  });

  it("callers cannot change the store through a returned row", async () => {
    const page = await demoPropertiesDriver.fetchPublishedProperties(filters());
    page.items[0].title = "changed";
    const again = await demoPropertiesDriver.fetchPublishedProperties(filters());
    expect(again.items[0].title).not.toBe("changed");
  });

  it("blog reads return copies, never the store's own rows", async () => {
    const page = await demoPostsDriver.fetchPublishedPosts({ page: 1 });
    page.posts[0].title = "changed";
    page.posts[0].tags.push("changed");
    const post = await demoPostsDriver.fetchPostBySlug(page.posts[0].slug);
    if (!post) throw new Error("seed post missing");
    post.title = "changed";
    post.tags.push("changed");
    const again = await demoPostsDriver.fetchPostBySlug(page.posts[0].slug);
    expect(again?.title).not.toBe("changed");
    expect(again?.tags).not.toContain("changed");
    expect((await demoPostsDriver.fetchPublishedPosts({ page: 1 })).posts[0].title).not.toBe("changed");
  });

  it("a hidden or draft property linked to a post is not returned as related; an unpublished post hides its links", async () => {
    const store = getDemoStore();
    const post = store.posts.find((row) => row.status === "published" && store.post_properties.some((l) => l.post_id === row.id));
    if (!post) throw new Error("seed has no post with related properties");
    const links = store.post_properties.filter((l) => l.post_id === post.id).sort((a, b) => a.position - b.position);
    const before = await demoPostsDriver.fetchPostBySlug(post.slug);
    expect(before?.related.map((p) => p.id)).toEqual(links.map((l) => l.property_id));

    const target = store.properties.find((p) => p.id === links[0].property_id);
    if (!target) throw new Error("linked property missing");
    target.status = "hidden";
    target.hidden_at = new Date(0).toISOString();
    const after = await demoPostsDriver.fetchPostBySlug(post.slug);
    expect(after?.related.map((p) => p.id)).toEqual(links.slice(1).map((l) => l.property_id));

    post.status = "draft";
    expect(await demoPostsDriver.fetchPostBySlug(post.slug)).toBeNull();
    resetDemoStore();
  });

  it("resetDemoStore restores the seed", async () => {
    getDemoStore().properties.length = 0;
    resetDemoStore();
    expect(getDemoStore().properties.length).toBe(seedRows.length);
  });
});

// Supabase run: needs the local stack with supabase/seed.sql loaded. Probed with a short timeout; skipped when absent.
const probeSupabase = async (): Promise<boolean> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url}/rest/v1/agents?select=id&limit=1`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const supabaseReachable = await probeSupabase();

runContract(
  "supabase (local database)",
  // Loaded lazily so a missing database never touches the Supabase client.
  async () => ({
    properties: (await import("./supabase/properties")).supabasePropertiesDriver,
    pages: (await import("./supabase/pages")).supabasePagesDriver,
    agents: (await import("./supabase/agents")).supabaseAgentsDriver,
    settings: (await import("./supabase/settings")).supabaseSettingsDriver,
    posts: (await import("./supabase/posts")).supabasePostsDriver,
  }),
  !supabaseReachable,
);

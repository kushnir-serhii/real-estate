import type { Database } from "@/lib/supabase/database.types";
import { DEMO_ADMIN } from "../session";
import type { DemoData } from "../store";
import { SEED_AGENT_KEYS, SEED_AGENTS } from "./agents";
import { buildSeedLeads } from "./leads";
import { SEED_PAGES } from "./pages";
import { SEED_POSTS } from "./posts";
import { SEED_PHOTO_FILES, SEED_PHOTO_SETS } from "./photos";
import { EXTRA_PHOTO_SETS, EXTRA_SEED_PROPERTIES } from "./extra-properties";
import { SEED_PROPERTIES } from "./properties";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

/** Units of each currency per 1 USD (as in supabase/seed.sql). */
export const SEED_EXCHANGE_RATES = { UAH: 41.5, EUR: 0.92 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (now: number, days: number): string => new Date(now - days * DAY_MS).toISOString();

/** Stable ids so links, favourites and tests survive a reset. */
const propertyId = (index: number): string => `00000000-0000-4000-8001-${String(index + 1).padStart(12, "0")}`;
const photoId = (index: number): string => `00000000-0000-4000-8002-${String(index + 1).padStart(12, "0")}`;
const postId = (index: number): string => `00000000-0000-4000-8003-${String(index + 1).padStart(12, "0")}`;

/** `price_usd` as the SQL seed derives it: the amount itself in USD, otherwise round(amount / rate). */
const toUsd = (amount: number | null, currency: PropertyRow["currency"]): number | null => {
  if (amount === null || currency === null) return null;
  return currency === "USD" ? amount : Math.round(amount / SEED_EXCHANGE_RATES[currency]);
};

/** All demo data as of `now`: relative dates in the seed become absolute here. */
export const buildDemoSeed = (now: number): DemoData => {
  const nowIso = new Date(now).toISOString();

  const agents = SEED_AGENT_KEYS.map((key) => ({ ...SEED_AGENTS[key], created_at: nowIso, updated_at: nowIso }));

  const properties = [...SEED_PROPERTIES, ...EXTRA_SEED_PROPERTIES].map(({ agent, publishedDaysAgo, hiddenDaysAgo, ...fields }, index): PropertyRow => {
    const publishedAt = publishedDaysAgo === null ? null : daysAgo(now, publishedDaysAgo);
    const { price_amount, area_total } = fields;
    return {
      ...fields,
      id: propertyId(index),
      agent_id: agent ? SEED_AGENTS[agent].id : null,
      price_usd: toUsd(price_amount, fields.currency),
      price_per_m2: price_amount !== null && area_total !== null && area_total > 0 ? Math.round(price_amount / area_total) : null,
      published_at: publishedAt,
      hidden_at: hiddenDaysAgo === null ? null : daysAgo(now, hiddenDaysAgo),
      synced_at: fields.source === "plektan" ? publishedAt : null,
      source_updated_at: null,
      created_at: publishedAt ?? nowIso,
      updated_at: publishedAt ?? nowIso,
    };
  });

  const idBySlug = new Map(properties.map((p) => [p.slug, p.id]));
  let photoIndex = 0;
  const property_photos = Object.entries({ ...SEED_PHOTO_SETS, ...EXTRA_PHOTO_SETS }).flatMap(([slug, files]) => {
    const property_id = idBySlug.get(slug);
    if (!property_id) throw new Error(`Demo seed: photo set for unknown property "${slug}"`);
    return files.map((file, position) => ({
      id: photoId(photoIndex++),
      property_id,
      position,
      r2_key: `placeholders/${file}.webp`,
      width: SEED_PHOTO_FILES[file].width,
      height: SEED_PHOTO_FILES[file].height,
      sizes: null,
      source_url: null,
      created_at: nowIso,
    }));
  });

  const sampleLeads = buildSeedLeads(now, idBySlug);

  const pages = SEED_PAGES.map((page) => ({ ...page, created_at: nowIso, updated_at: nowIso }));

  const posts = SEED_POSTS.map(({ cover, agent, properties: linked, publishedDaysAgo, ...fields }, index): PostRow => {
    void linked;
    const publishedAt = publishedDaysAgo === null ? null : daysAgo(now, publishedDaysAgo);
    return {
      ...fields,
      id: postId(index),
      status: publishedAt === null ? "draft" : "published",
      cover_key: cover === null ? null : `placeholders/${cover}.webp`,
      author_agent_id: agent ? SEED_AGENTS[agent].id : null,
      published_at: publishedAt,
      created_at: publishedAt ?? nowIso,
      updated_at: publishedAt ?? nowIso,
    };
  });

  const post_properties = SEED_POSTS.flatMap((post, index) =>
    post.properties.map((slug, position) => {
      const property_id = idBySlug.get(slug);
      if (!property_id) throw new Error(`Demo seed: post "${post.slug}" links unknown property "${slug}"`);
      return { post_id: postId(index), property_id, position };
    }),
  );

  return {
    properties,
    property_photos,
    agents,
    pages,
    posts,
    post_properties,
    settings: {
      id: true,
      exchange_rates: { ...SEED_EXCHANGE_RATES },
      properties_source: "admin",
      last_sync_at: null,
      sync_cursor: null,
      updated_at: nowIso,
    },
    leads: sampleLeads.leads,
    ai_conversations: sampleLeads.ai_conversations,
    ai_messages: sampleLeads.ai_messages,
    ai_usage: [],
    admins: [
      { user_id: DEMO_ADMIN.userId, email: DEMO_ADMIN.email, created_at: nowIso },
    ],
  };
};

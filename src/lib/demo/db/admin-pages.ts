import "server-only";
import type { PageContent } from "@/constants/pages";
import type { AdminPagesDriver } from "@/lib/db/driver-types";
import { getDemoStore } from "../store";

/** Rows are returned as copies, never the store's own objects. */
const fetchPageRows: AdminPagesDriver["fetchPageRows"] = async (slugs) =>
  getDemoStore()
    .pages.filter((page) => slugs.includes(page.slug))
    .map((page) => ({ ...page }));

const fetchPageRow: AdminPagesDriver["fetchPageRow"] = async (slug) => {
  const page = getDemoStore().pages.find((row) => row.slug === slug);
  return page ? { ...page } : null;
};

/** Upsert on `slug`; `updated_at` is bumped on update (the `set_updated_at` trigger). */
const upsertPage = async (slug: string, content: PageContent): Promise<void> => {
  const store = getDemoStore();
  const now = new Date().toISOString();
  const existing = store.pages.find((row) => row.slug === slug);
  if (existing) {
    Object.assign(existing, content, { updated_at: now });
    return;
  }
  store.pages.push({ slug, ...content, created_at: now, updated_at: now });
};

const deletePage = async (slug: string): Promise<void> => {
  const store = getDemoStore();
  store.pages = store.pages.filter((row) => row.slug !== slug);
};

export const demoAdminPagesDriver: AdminPagesDriver = { fetchPageRows, fetchPageRow, upsertPage, deletePage };

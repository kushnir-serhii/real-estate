import "server-only";
import { DEFAULT_PAGES, PAGE_SLUGS } from "@/constants/pages";
import type { PageContent, PageSlug } from "@/constants/pages";
import { isDemoMode } from "@/lib/data-driver";
import type { AdminPagesDriver } from "./driver-types";
import type { Page } from "./pages";

/**
 * Static pages for the admin (service role: call only after `requireAdmin`). The slugs are fixed
 * (`PAGE_SLUGS`): a missing row means the built-in default text is shown on the site.
 */

/** `default`: no row, the site shows the built-in text; `custom`: saved in the admin. */
export type AdminPageState = "default" | "custom";

export type AdminPageListItem = Pick<PageContent, "title" | "noindex" | "is_draft"> & {
  slug: PageSlug;
  state: AdminPageState;
  /** Last save; null while the page is the default. */
  updated_at: string | null;
};

export type AdminPage = { slug: PageSlug; content: PageContent; state: AdminPageState; updated_at: string | null };

const toContent = (row: Page): PageContent => ({
  title: row.title,
  body: row.body,
  seo_title: row.seo_title,
  seo_description: row.seo_description,
  noindex: row.noindex,
  is_draft: row.is_draft,
});

const loadDriver = async (): Promise<AdminPagesDriver> =>
  isDemoMode()
    ? (await import("@/lib/demo/db/admin-pages")).demoAdminPagesDriver
    : (await import("@/lib/db/supabase/admin-pages")).supabaseAdminPagesDriver;

/** The four pages in the fixed order, each from its row or the default. */
export const listAdminPages = async (): Promise<AdminPageListItem[]> => {
  const data = await (await loadDriver()).fetchPageRows(PAGE_SLUGS);

  return PAGE_SLUGS.map((slug): AdminPageListItem => {
    const row = data.find((r) => r.slug === slug);
    if (!row) {
      const { title, noindex, is_draft } = DEFAULT_PAGES[slug];
      return { slug, title, noindex, is_draft, state: "default", updated_at: null };
    }
    const { title, noindex, is_draft, updated_at } = row;
    return { slug, title, noindex, is_draft, state: "custom", updated_at };
  });
};

/** One page: the saved row or the default. */
export const getAdminPage = async (slug: PageSlug): Promise<AdminPage> => {
  const data = await (await loadDriver()).fetchPageRow(slug);
  if (!data) return { slug, content: DEFAULT_PAGES[slug], state: "default", updated_at: null };
  return { slug, content: toContent(data), state: "custom", updated_at: data.updated_at };
};

/** Creates the row on the first save, updates it afterwards (`updated_at` comes from the trigger on update). */
export const saveAdminPage = async (slug: PageSlug, content: PageContent): Promise<void> =>
  (await loadDriver()).upsertPage(slug, content);

/** Back to the built-in text: deletes the row. */
export const resetAdminPage = async (slug: PageSlug): Promise<void> => (await loadDriver()).deletePage(slug);

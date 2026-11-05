import "server-only";
import type { PagesDriver } from "@/lib/db/driver-types";
import type { Page } from "@/lib/db/pages";
import { getDemoStore } from "../store";

/** `pages` is publicly readable (policy "public reads pages"): drafts included, `is_draft` is only a notice. */
const fetchPage = async (slug: string): Promise<Page | null> => {
  const page = getDemoStore().pages.find((p) => p.slug === slug);
  return page ? { ...page } : null;
};

export const demoPagesDriver: PagesDriver = { fetchPage };

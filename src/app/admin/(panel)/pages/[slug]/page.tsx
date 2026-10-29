import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PageEditHeader } from "@/features/admin/pages/page-edit-header";
import { PageForm } from "@/features/admin/pages/page-form";
import { pageToFormRaw } from "@/features/admin/pages/page-form-schema";
import { PAGE_NAMES } from "@/features/admin/pages/page-labels";
import { PAGE_PATHS, isPageSlug } from "@/features/pages/page-paths";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getAdminPage } from "@/lib/db/admin-pages";
import type { AdminPage } from "@/lib/db/admin-pages";
import { getSiteUrl } from "@/lib/site-url";

type AdminPageEditProps = { params: Promise<{ slug: string }> };

/** Only the fixed slugs exist; `getAdminPage` uses the service role, so the admin is checked first. */
const loadPage = cache(async (slug: string): Promise<AdminPage | null> => {
  if (!isPageSlug(slug)) return null;
  const admin = await requireAdmin();
  if (!admin.ok) return null;
  return getAdminPage(slug);
});

export const generateMetadata = async ({ params }: AdminPageEditProps): Promise<Metadata> => {
  const { slug } = await params;
  return { title: isPageSlug(slug) ? `Сторінка — ${PAGE_NAMES[slug]}` : "Сторінку не знайдено" };
};

const AdminPageEdit = async ({ params }: AdminPageEditProps) => {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageEditHeader page={page} />
      <PageForm
        key={page.slug}
        slug={page.slug}
        initialValues={pageToFormRaw(page.content)}
        isDefault={page.state === "default"}
        siteUrl={getSiteUrl()}
        path={PAGE_PATHS[page.slug]}
      />
    </div>
  );
};

export default AdminPageEdit;

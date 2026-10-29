import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PropertyPhotos } from "@/features/admin/properties/photos/property-photos";
import { PropertyPhotosReadOnly } from "@/features/admin/properties/photos/property-photos-read-only";
import { PropertyEditHeader } from "@/features/admin/properties/property-edit-header";
import { PropertyEditor } from "@/features/admin/properties/property-editor";
import { geocodeWarning } from "@/features/admin/properties/property-form-state";
import { propertyToFormRaw } from "@/features/admin/properties/property-form-values";
import type { AgentOption } from "@/features/admin/properties/property-form-values";
import { propertyListStatus } from "@/features/admin/properties/property-list-status";
import { PropertyReadOnlyBanner } from "@/features/admin/properties/property-read-only-banner";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getActiveAgents, getAdminProperty } from "@/lib/db/admin-properties";
import type { AdminProperty, GeocodeStatus } from "@/lib/db/admin-properties";
import { SOLD_PAGE_DAYS } from "@/lib/db/properties";
import { canEditProperty } from "@/lib/db/property-permissions";
import { getSettings } from "@/lib/db/settings";

type AdminPropertyPageProps = {
  params: Promise<{ id: string }>;
  /** `geocode`: set once by the create redirect. */
  searchParams: Promise<{ geocode?: string | string[] }>;
};

/** `getAdminProperty` uses the service role: check the admin first. One query per request. */
const loadProperty = cache(async (id: string): Promise<AdminProperty | null> => {
  const admin = await requireAdmin();
  if (!admin.ok) return null;
  return getAdminProperty(id);
});

const GEOCODE_STATUSES = ["found", "not_found", "skipped", "failed"] as const satisfies readonly GeocodeStatus[];

const toGeocodeStatus = (value: string | string[] | undefined): GeocodeStatus | null =>
  GEOCODE_STATUSES.find((status) => status === value) ?? null;

const TITLE_MAX = 40;
const shortTitle = (title: string) =>
  title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX).trimEnd()}…` : title || "Без назви";

const SOLD_PAGE_MS = SOLD_PAGE_DAYS * 24 * 60 * 60 * 1000;

/** The public page exists while published and for SOLD_PAGE_DAYS after hiding (the «sold» page). */
const siteHrefOf = (p: Pick<AdminProperty, "status" | "published_at" | "hidden_at" | "slug">): string | null => {
  const href = `/catalog/${p.slug}`;
  if (p.status === "published") return href;
  if (p.published_at === null || p.hidden_at === null) return null;
  return Date.now() - Date.parse(p.hidden_at) < SOLD_PAGE_MS ? href : null;
};

export const generateMetadata = async ({ params }: AdminPropertyPageProps): Promise<Metadata> => {
  const { id } = await params;
  const property = await loadProperty(id);
  return { title: property ? `Об'єкт — ${shortTitle(property.title)}` : "Об'єкт не знайдено" };
};

const AdminPropertyPage = async ({ params, searchParams }: AdminPropertyPageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const property = await loadProperty(id);
  if (!property) notFound();

  const [settings, activeAgents] = await Promise.all([getSettings(), getActiveAgents()]);
  const permissions = canEditProperty(settings.properties_source, property.source);
  const status = propertyListStatus(property);
  const seoOnly = permissions.fields === "seo";

  // The current agent stays selectable even if no longer active (otherwise saving would drop them silently).
  const agents: AgentOption[] = activeAgents.map((a) => ({ ...a, inactive: false }));
  const current = property.agent;
  if (current && !agents.some((a) => a.id === current.id)) {
    agents.push({ id: current.id, name: current.name, inactive: !current.is_active });
  }

  const geocode = toGeocodeStatus(query.geocode);

  return (
    <div className="flex flex-col gap-6">
      <PropertyEditHeader property={property} status={status} siteHref={siteHrefOf(property)} />
      {seoOnly && <PropertyReadOnlyBanner source={property.source} />}
      <PropertyEditor
        key={property.id}
        propertyId={property.id}
        title={property.title}
        status={status}
        initialValues={propertyToFormRaw(property)}
        agents={agents}
        seoOnly={seoOnly}
        canPublish={permissions.publish}
        canDelete={permissions.fields === "all" && property.published_at === null}
        hasPhotos={property.photos.length > 0}
        slug={{ value: property.slug, frozen: property.published_at !== null }}
        soldPageDays={SOLD_PAGE_DAYS}
        createdNotice={geocode ? { geocodeWarning: geocodeWarning(geocode) } : null}
        photos={
          permissions.photos ? (
            <PropertyPhotos propertyId={property.id} photos={property.photos} />
          ) : (
            <PropertyPhotosReadOnly photos={property.photos} />
          )
        }
      />
    </div>
  );
};

export default AdminPropertyPage;

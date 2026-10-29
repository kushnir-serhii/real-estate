"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { AdminListStatus } from "@/lib/db/admin-property-filters";
import type { PropertyFormRaw, PublishRequirement } from "./property-form-schema";
import { PropertyForm } from "./property-form";
import { propertyFieldId } from "./property-form-values";
import type { AgentOption } from "./property-form-values";
import { PropertyPublishCard } from "./property-publish-card";

type PropertyEditorProps = {
  propertyId: string;
  title: string;
  status: AdminListStatus;
  initialValues: PropertyFormRaw;
  agents: readonly AgentOption[];
  seoOnly: boolean;
  canPublish: boolean;
  canDelete: boolean;
  hasPhotos: boolean;
  slug: { value: string; frozen: boolean };
  soldPageDays: number;
  /** Just created (from `?geocode=`): the form says so once. */
  createdNotice: { geocodeWarning: string | null } | null;
};

/** The edit page body: the form and, from `lg` on the right, the publish card (above the form on phones). */
export const PropertyEditor = ({
  propertyId,
  title,
  status,
  initialValues,
  agents,
  seoOnly,
  canPublish,
  canDelete,
  hasPhotos,
  slug,
  soldPageDays,
  createdNotice,
}: PropertyEditorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [dirty, setDirty] = useState(false);
  const [missing, setMissing] = useState<{ items: PublishRequirement[] }>({ items: [] });

  // `?geocode=` is a one-time message from the create redirect: drop it so a reload doesn't repeat it.
  useEffect(() => {
    if (createdNotice) router.replace(pathname, { scroll: false });
  }, [createdNotice, pathname, router]);

  // A failed publish: focus the first missing field that can be edited here.
  useEffect(() => {
    const first = missing.items
      .map((item) => document.getElementById(propertyFieldId(item.field)))
      .find((el) => el instanceof HTMLElement && !el.matches(":disabled"));
    first?.focus();
  }, [missing]);

  const onMissing = useCallback((items: PublishRequirement[]) => setMissing({ items }), []);

  return (
    <div className={cn("grid items-start gap-6", canPublish && "lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]")}>
      {canPublish && (
        <aside className="min-w-0 lg:sticky lg:top-6 lg:order-last">
          <PropertyPublishCard
            propertyId={propertyId}
            title={title}
            status={status}
            canDelete={canDelete}
            hasPhotos={hasPhotos}
            dirty={dirty}
            soldPageDays={soldPageDays}
            onMissing={onMissing}
          />
        </aside>
      )}
      <PropertyForm
        propertyId={propertyId}
        initialValues={initialValues}
        agents={agents}
        seoOnly={seoOnly}
        slug={slug}
        publishMissing={missing.items}
        createdNotice={createdNotice}
        onDirtyChange={setDirty}
      />
    </div>
  );
};

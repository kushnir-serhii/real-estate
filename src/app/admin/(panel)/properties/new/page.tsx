import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { ADMIN_PROPERTIES_PATH } from "@/features/admin/properties/properties-params";
import { PropertyCreateDisabled } from "@/features/admin/properties/property-create-disabled";
import { PropertyForm } from "@/features/admin/properties/property-form";
import { EMPTY_PROPERTY_FORM } from "@/features/admin/properties/property-form-values";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getActiveAgents } from "@/lib/db/admin-properties";
import { canCreateProperty } from "@/lib/db/property-permissions";
import { getSettings } from "@/lib/db/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Новий об'єкт" };

const AdminNewPropertyPage = async () => {
  // Agents are read with the service role: check the admin first (the layout renders in parallel).
  const admin = await requireAdmin();
  if (!admin.ok) notFound();
  const settings = await getSettings();
  const canCreate = canCreateProperty(settings.properties_source);
  const agents = canCreate ? await getActiveAgents() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href={ADMIN_PROPERTIES_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 self-start")}>
          <ArrowLeft aria-hidden="true" />
          До списку об&apos;єктів
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Новий об&apos;єкт</h1>
          {canCreate && (
            <p className="max-w-prose text-muted-foreground">
              Спершу збережіть чернетку — на сайті її не видно. Потім можна додати фото й опублікувати.
            </p>
          )}
        </div>
      </div>
      {canCreate ? (
        <PropertyForm
          propertyId={null}
          initialValues={EMPTY_PROPERTY_FORM}
          agents={agents.map((a) => ({ ...a, inactive: false }))}
          seoOnly={false}
          slug={null}
          publishMissing={[]}
          createdNotice={null}
        />
      ) : (
        <PropertyCreateDisabled />
      )}
    </div>
  );
};

export default AdminNewPropertyPage;

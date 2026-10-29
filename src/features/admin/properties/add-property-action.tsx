import { Plus } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { canCreateProperty } from "@/lib/db/property-permissions";
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { cn } from "@/lib/utils";
import { ADMIN_SETTINGS_PATH, NEW_PROPERTY_PATH } from "./properties-params";

type AddPropertyActionProps = { mode: PropertiesMode; className?: string };

const HINT_ID = "add-property-hint";

/**
 * «Додати об'єкт». In `plektan` mode the button stays visible but disabled, with the reason and
 * the way out (settings) right under it.
 */
export const AddPropertyAction = ({ mode, className }: AddPropertyActionProps) => {
  if (canCreateProperty(mode)) {
    return (
      <Link href={NEW_PROPERTY_PATH} className={cn(buttonVariants(), className)}>
        <Plus aria-hidden="true" />
        Додати об&apos;єкт
      </Link>
    );
  }
  return (
    <div className={cn("flex flex-col items-start gap-2 sm:items-end", className)}>
      <Button type="button" disabled aria-describedby={HINT_ID}>
        <Plus aria-hidden="true" />
        Додати об&apos;єкт
      </Button>
      <p id={HINT_ID} className="max-w-xs text-sm text-muted-foreground sm:text-right">
        Нові об&apos;єкти додаються в Plektan. Щоб вести об&apos;єкти тут, змініть джерело{" "}
        <Link
          href={ADMIN_SETTINGS_PATH}
          className="font-medium text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          в налаштуваннях
        </Link>
        .
      </p>
    </div>
  );
};

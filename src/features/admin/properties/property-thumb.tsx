import { ImageOff } from "lucide-react";

import type { AdminPropertyCover } from "@/lib/db/admin-properties";
import { smallestPhotoUrl } from "@/lib/photos/photo-src-set";
import { cn } from "@/lib/utils";

type PropertyThumbProps = {
  cover: AdminPropertyCover | null;
  /** `sm`: table (64×48); `md`: cards (80×60). Both 4:3. */
  size: "sm" | "md";
  className?: string;
};

const BOX: Record<PropertyThumbProps["size"], { className: string; width: number; height: number }> = {
  sm: { className: "h-12 w-16", width: 64, height: 48 },
  md: { className: "h-15 w-20", width: 80, height: 60 },
};

/** Cover thumbnail (narrowest stored size, lazy, fixed box: no layout shift) or a placeholder. */
export const PropertyThumb = ({ cover, size, className }: PropertyThumbProps) => {
  const box = BOX[size];
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-md bg-muted", box.className, className)}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
        <img
          src={smallestPhotoUrl(cover)}
          alt=""
          width={box.width}
          height={box.height}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-5" aria-hidden="true" />
          <span className="sr-only">Без фото</span>
        </div>
      )}
    </div>
  );
};

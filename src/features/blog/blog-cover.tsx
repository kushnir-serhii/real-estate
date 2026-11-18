import { ImageOff } from "lucide-react";

import { BLOG_POST_PAGE } from "@/constants/blog";
import { photoUrl } from "@/lib/photos/photo-url";
import { cn } from "@/lib/utils";

type BlogCoverProps = {
  coverKey: string | null;
  alt: string | null;
  /** `sizes` attribute: how wide the cover is in the layout. */
  sizes: string;
  /** First-screen cover: eager and high priority. */
  priority?: boolean;
  /** Zoom the image when the parent `group` is hovered (cards). */
  zoomOnHover?: boolean;
  className?: string;
};

// Covers have no stored dimensions: the box is a fixed 16:9 and the image fills it, so nothing shifts.
const WIDTH = 1280;
const HEIGHT = 720;

/** A 16:9 cover; without one, a quiet placeholder of the same size. */
export const BlogCover = ({ coverKey, alt, sizes, priority = false, zoomOnHover = false, className }: BlogCoverProps) => (
  <div className={cn("relative aspect-video w-full overflow-hidden rounded-lg bg-muted", className)}>
    {coverKey ? (
      // eslint-disable-next-line @next/next/no-img-element -- covers come from R2/public; Workers has no image optimizer
      <img
        src={photoUrl(coverKey)}
        sizes={sizes}
        alt={alt ?? ""}
        width={WIDTH}
        height={HEIGHT}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn(
          "size-full object-cover",
          zoomOnHover &&
            "transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
        )}
      />
    ) : (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-linear-to-br from-brand/15 to-muted text-muted-foreground">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-sm">{BLOG_POST_PAGE.coverMissing}</span>
      </div>
    )}
  </div>
);

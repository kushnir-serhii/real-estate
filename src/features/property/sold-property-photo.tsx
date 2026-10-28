import { Building2 } from "lucide-react";

import type { PropertyPhoto } from "@/lib/db/properties";
import { photoSrcSet } from "@/lib/photos/photo-src-set";
import { photoUrl } from "@/lib/photos/photo-url";

type SoldPropertyPhotoProps = {
  photo: PropertyPhoto | undefined;
  /** «Продано» / «Вже здано», shown over the photo. */
  status: string;
};

// The box has a fixed ratio; these only give the browser an intrinsic size when none is stored.
const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 960;
const PHOTO_SIZES = "(min-width: 1152px) 46rem, (min-width: 1024px) 60vw, 100vw";

/** First photo, muted (grayscale, faded) so the page reads as «no longer available»; placeholder without photos. */
export const SoldPropertyPhoto = ({ photo, status }: SoldPropertyPhotoProps) => {
  const srcSet = photo ? photoSrcSet(photo.sizes) : undefined;
  return (
    <div className="relative -mx-4 aspect-4/3 overflow-hidden bg-muted sm:mx-0 sm:aspect-3/2 sm:rounded-xl">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
        <img
          src={photoUrl(photo.r2_key)}
          srcSet={srcSet}
          sizes={srcSet ? PHOTO_SIZES : undefined}
          alt=""
          width={photo.width ?? FALLBACK_WIDTH}
          height={photo.height ?? FALLBACK_HEIGHT}
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover opacity-60 grayscale"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="size-10" aria-hidden="true" />
          <span className="text-sm">Фото немає</span>
        </div>
      )}
      <span
        aria-hidden="true"
        className="absolute top-3 left-3 rounded-md bg-background/90 px-3 py-1.5 text-sm font-semibold text-foreground"
      >
        {status}
      </span>
    </div>
  );
};

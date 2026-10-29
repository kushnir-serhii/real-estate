import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import { smallestPhotoUrl } from "@/lib/photos/photo-src-set";

type PhotoImageProps = {
  photo: Pick<AdminPropertyPhoto, "r2_key" | "sizes">;
  /** 0-based; 0 is the cover. */
  index: number;
};

/** A photo in the admin grid: fixed 4:3 box (no layout shift), narrowest stored size, number and cover badge. */
export const PhotoImage = ({ photo, index }: PhotoImageProps) => (
  <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-muted">
    {/* eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer */}
    <img
      src={smallestPhotoUrl(photo)}
      alt={index === 0 ? `Фото ${index + 1}, обкладинка` : `Фото ${index + 1}`}
      width={480}
      height={360}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="size-full object-cover"
    />
    {index === 0 && (
      <span
        aria-hidden="true"
        className="absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
      >
        Обкладинка
      </span>
    )}
    <span
      aria-hidden="true"
      className="absolute top-2 right-2 min-w-6 rounded-md bg-scrim px-1.5 py-0.5 text-center text-xs font-medium text-on-scrim tabular-nums"
    >
      {index + 1}
    </span>
  </div>
);

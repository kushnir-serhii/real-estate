import type { AdminPropertyPhoto } from "@/lib/db/admin-properties";
import { PropertyFormSection } from "../property-form-section";
import { PhotoImage } from "./photo-image";

type PropertyPhotosReadOnlyProps = { photos: readonly AdminPropertyPhoto[] };

/** `plektan` mode: the photos as they are, no controls. */
export const PropertyPhotosReadOnly = ({ photos }: PropertyPhotosReadOnlyProps) => (
  <PropertyFormSection
    id="photos"
    title="Фото"
    description="Каталог зараз веде Plektan, тож фото тут не додаються, не переставляються й не видаляються."
  >
    {photos.length > 0 ? (
      <ul aria-label="Фото об'єкта" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className="min-w-0">
            <PhotoImage photo={photo} index={index} />
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">Фото немає.</p>
    )}
  </PropertyFormSection>
);

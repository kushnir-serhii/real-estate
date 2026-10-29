import { ImagePlus } from "lucide-react";

import { PropertyFormSection } from "../property-form-section";

/** The new-property page: photos need a stored draft first. */
export const PhotosAfterSaveNote = () => (
  <PropertyFormSection id="photos" title="Фото">
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <ImagePlus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      Фото можна додати після збереження чернетки.
    </p>
  </PropertyFormSection>
);

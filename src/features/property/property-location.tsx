import { MapPin } from "lucide-react";

import { PROPERTY_PAGE } from "@/constants/inner-pages";
import { StaticMap } from "@/features/map/static-map";

type PropertyLocationProps = {
  text: string | null;
  /** Rounded to ~100 m by the sync: an approximate area, never the house. */
  coordinates: { lat: number; lng: number } | null;
};

/** Approximate location as text (no house number) and, when coordinates exist, an offline map of the area. */
export const PropertyLocation = ({ text, coordinates }: PropertyLocationProps) => {
  if (!text && !coordinates) return null;
  return (
    <section aria-labelledby="property-location-title">
      <h2 id="property-location-title" className="text-h3">
        {PROPERTY_PAGE.locationTitle}
      </h2>
      {text && (
        <p className="mt-4 flex items-start gap-2">
          <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-words">{text}</span>
        </p>
      )}
      <p className="mt-1 pl-6 text-sm text-muted-foreground">Точну адресу повідомить агент.</p>
      {coordinates && (
        <StaticMap
          lat={coordinates.lat}
          lng={coordinates.lng}
          address={text ?? "Район розташування"}
          approximate
          className="mt-4"
        />
      )}
    </section>
  );
};

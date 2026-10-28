import { ExternalLink, MapPin } from "lucide-react";

import { PropertyMap } from "./property-map";

type PropertyLocationProps = {
  text: string | null;
  /** Rounded to ~100 m by the sync: an approximate area, never the house. */
  coordinates: { lat: number; lng: number } | null;
};

const OSM_ZOOM = 16;

// No `mlat/mlon` marker on purpose: the coordinates are approximate, so no pin anywhere.
const osmUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.openstreetmap.org/#map=${OSM_ZOOM}/${lat}/${lng}`;

/** Approximate location as text (no house number) and, when coordinates exist, a lazy map of the area. */
export const PropertyLocation = ({ text, coordinates }: PropertyLocationProps) => {
  if (!text && !coordinates) return null;
  return (
    <section aria-labelledby="property-location-title">
      <h2 id="property-location-title" className="text-xl font-bold">
        Розташування
      </h2>
      {text && (
        <p className="mt-3 flex items-start gap-2">
          <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-words">{text}</span>
        </p>
      )}
      <p className="mt-1 pl-6 text-sm text-muted-foreground">Точну адресу повідомить агент.</p>
      {coordinates && (
        <>
          <PropertyMap lat={coordinates.lat} lng={coordinates.lng} className="mt-4" />
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm text-muted-foreground">На карті показано приблизний район.</p>
            <a
              href={osmUrl(coordinates)}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 sm:self-auto"
            >
              Відкрити в OpenStreetMap
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </>
      )}
    </section>
  );
};

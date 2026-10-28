import { ExternalLink } from "lucide-react";

import { SITE_CONFIG } from "@/lib/site-config";

const DELTA = 0.006;

const { lat, lng } = SITE_CONFIG.coordinates;
const EMBED_URL = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - DELTA},${lat - DELTA},${lng + DELTA},${lat + DELTA}&layer=mapnik&marker=${lat},${lng}`;
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export const MapEmbed = () => (
  <section aria-labelledby="map-title" className="flex flex-col gap-4">
    <h2 id="map-title" className="text-2xl font-bold">
      Як нас знайти
    </h2>
    <div className="aspect-4/3 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 sm:aspect-video">
      <iframe
        src={EMBED_URL}
        title={`Карта: ${SITE_CONFIG.address}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-full border-0"
      />
    </div>
    <a
      href={GOOGLE_MAPS_URL}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      Відкрити в Google Maps
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  </section>
);

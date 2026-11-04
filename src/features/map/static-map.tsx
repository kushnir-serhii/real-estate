import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildMapLayout, MAP_HEIGHT, MAP_WIDTH, PIN_X, PIN_Y } from "./static-map-layout";

type StaticMapProps = {
  lat: number;
  lng: number;
  /** Text shown under the map and used as the alternative text. */
  address: string;
  /** Rounded coordinates: draw an area halo and don't put a marker on the external map. */
  approximate?: boolean;
  className?: string;
};

const OSM_ZOOM = 16;

const osmUrl = (lat: number, lng: number, approximate: boolean) =>
  `https://www.openstreetmap.org/${approximate ? "" : `?mlat=${lat}&mlon=${lng}`}#map=${OSM_ZOOM}/${lat}/${lng}`;

/**
 * Offline map: a stylised SVG of streets and blocks with a pin, seeded from the coordinates.
 * It makes no request; the link is a plain `<a>` that opens OpenStreetMap only when clicked.
 */
export const StaticMap = ({ lat, lng, address, approximate = false, className }: StaticMapProps) => {
  const { blocks, avenue } = buildMapLayout(lat, lng);
  const label = approximate ? `Схематична карта: приблизний район, ${address}` : `Схематична карта: ${address}`;

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="aspect-4/3 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 sm:aspect-video">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="size-full"
        >
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="fill-muted" />
          {blocks.map((block) => (
            <rect
              key={`${block.x}-${block.y}`}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              rx={4}
              className={block.park ? "fill-accent stroke-primary/30" : "fill-card stroke-border"}
              strokeWidth={1}
            />
          ))}
          <line {...avenue} strokeWidth={14} className="stroke-border" />
          <line {...avenue} strokeWidth={10} className="stroke-muted" />
          <line {...avenue} strokeWidth={1.5} strokeDasharray="8 8" className="stroke-muted-foreground/40" />
          {approximate && (
            <circle cx={PIN_X} cy={PIN_Y} r={46} className="fill-primary/15 stroke-primary/40" strokeWidth={1.5} />
          )}
          <ellipse cx={PIN_X} cy={PIN_Y} rx={9} ry={3.5} className="fill-foreground/25" />
          <g transform={`translate(${PIN_X} ${PIN_Y})`}>
            <path
              d="M0 0 C-9 -11 -15 -18 -15 -27 a15 15 0 1 1 30 0 C15 -18 9 -11 0 0z"
              className="fill-primary stroke-background"
              strokeWidth={2.5}
            />
            <circle cy={-27} r={5.5} className="fill-primary-foreground" />
          </g>
        </svg>
      </div>
      <figcaption className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="text-sm text-muted-foreground break-words">
          {approximate ? "Схема приблизного району." : address}
        </span>
        <a
          href={osmUrl(lat, lng, approximate)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 sm:self-auto"
        >
          Відкрити на мапі
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
};

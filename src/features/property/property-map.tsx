"use client";

import { MapIcon, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PropertyMapProps = { lat: number; lng: number; className?: string };

type MapStatus = { kind: "idle" } | { kind: "loading" } | { kind: "ready" } | { kind: "error" };

// start loading a bit before the box scrolls into view
const ROOT_MARGIN = "200px";

// Leaflet's own markup, restyled with tokens (its stylesheet sits in the `base` layer, see property-map.css).
const LEAFLET_SKIN = cn(
  "font-sans text-xs bg-muted outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
  "[&_.leaflet-bar]:rounded-lg [&_.leaflet-bar]:border-border [&_.leaflet-bar]:shadow-sm",
  "[&_.leaflet-bar_a]:size-11 [&_.leaflet-bar_a]:leading-11 [&_.leaflet-bar_a]:bg-background [&_.leaflet-bar_a]:text-foreground [&_.leaflet-bar_a]:border-border",
  "[&_.leaflet-bar_a:hover]:bg-muted [&_.leaflet-bar_a:focus-visible]:outline-none [&_.leaflet-bar_a:focus-visible]:ring-3 [&_.leaflet-bar_a:focus-visible]:ring-inset [&_.leaflet-bar_a:focus-visible]:ring-ring/50",
  "[&_.leaflet-bar_a.leaflet-disabled]:bg-muted [&_.leaflet-bar_a.leaflet-disabled]:text-muted-foreground",
  "[&_.leaflet-control-attribution]:bg-background/85 [&_.leaflet-control-attribution]:text-muted-foreground [&_.leaflet-control-attribution_a]:text-primary",
);

/** Lazy Leaflet map of the approximate area. The box has a fixed ratio, so nothing shifts when the map appears. */
export const PropertyMap = ({ lat, lng, className }: PropertyMapProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    const container = mapRef.current;
    if (!box || !container) return;

    let cancelled = false;
    let destroy: (() => void) | undefined;

    const load = () => {
      setStatus({ kind: "loading" });
      import("./property-map-leaflet")
        .then(({ createPropertyMap }) => {
          if (cancelled) return;
          destroy = createPropertyMap(container, { lat, lng });
          setStatus({ kind: "ready" });
        })
        .catch(() => {
          if (!cancelled) setStatus({ kind: "error" });
        });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(box);

    return () => {
      cancelled = true;
      observer.disconnect();
      destroy?.();
    };
  }, [lat, lng, attempt]);

  return (
    <div
      ref={boxRef}
      role="region"
      aria-label="Карта: приблизне розташування об'єкта"
      className={cn("relative isolate aspect-4/3 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 sm:aspect-video", className)}
    >
      <div ref={mapRef} className={cn("absolute inset-0", LEAFLET_SKIN)} />
      {status.kind !== "ready" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted p-4 text-center text-sm text-muted-foreground">
          <MapIcon className="size-8" aria-hidden="true" />
          {status.kind === "error" ? (
            <>
              <p role="alert">Не вдалося завантажити карту.</p>
              <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                <RotateCcw aria-hidden="true" />
                Спробувати ще раз
              </Button>
            </>
          ) : (
            <p>Карта завантажується…</p>
          )}
        </div>
      )}
    </div>
  );
};

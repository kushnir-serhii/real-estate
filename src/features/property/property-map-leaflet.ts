import L from "leaflet";

import "./property-map.css";

// Loaded only through `import()` from PropertyMap (browser only): Leaflet touches `window` on import.

const RADIUS_METERS = 300;
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapPoint = { lat: number; lng: number };

/** Draws an approximate area (a ~300 m circle, not a pin) and returns the cleanup. */
export const createPropertyMap = (container: HTMLElement, { lat, lng }: MapPoint): (() => void) => {
  const map = L.map(container, {
    scrollWheelZoom: false,
    // on phones one finger scrolls the page; zoom with the buttons or two fingers
    dragging: !L.Browser.mobile,
    keyboard: true,
  });

  L.tileLayer(TILE_URL, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(map);

  const center = L.latLng(lat, lng);
  // colors come from the `stroke-primary` / `fill-primary` token classes (CSS beats the SVG attributes)
  L.circle(center, { radius: RADIUS_METERS, className: "stroke-primary fill-primary", weight: 2, fillOpacity: 0.15, interactive: false }).addTo(map);
  map.fitBounds(center.toBounds(RADIUS_METERS * 2), { padding: [16, 16] });

  return () => {
    map.remove();
  };
};

import { MapPin } from "lucide-react";

type PropertyLocationProps = { text: string | null };

/** Approximate location as text (no house number). Slice 4 adds the map below the text. */
export const PropertyLocation = ({ text }: PropertyLocationProps) => {
  if (!text) return null;
  return (
    <section aria-labelledby="property-location-title">
      <h2 id="property-location-title" className="text-xl font-bold">
        Розташування
      </h2>
      <p className="mt-3 flex items-start gap-2">
        <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="break-words">{text}</span>
      </p>
      <p className="mt-1 pl-6 text-sm text-muted-foreground">Точну адресу повідомить агент.</p>
      {/* Map slot (spec 005 slice 4): fixed-height lazy map goes here. */}
    </section>
  );
};

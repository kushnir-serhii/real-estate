import { PROPERTY_PAGE } from "@/constants/inner-pages";
import { descriptionParagraphs } from "./property-details";

type PropertyDescriptionProps = { text: string | null };

/** Plain text from Plektan/admin: blank lines split paragraphs, single breaks are kept. */
export const PropertyDescription = ({ text }: PropertyDescriptionProps) => {
  const paragraphs = descriptionParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <section aria-labelledby="property-description-title">
      <h2 id="property-description-title" className="text-h3">
        {PROPERTY_PAGE.descriptionTitle}
      </h2>
      <div className="mt-4 flex max-w-prose flex-col gap-4 text-base leading-7 text-foreground/90">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="break-words whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
};

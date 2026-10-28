import { descriptionParagraphs } from "./property-details";

type PropertyDescriptionProps = { text: string | null };

/** Plain text from Plektan/admin: blank lines split paragraphs, single breaks are kept. */
export const PropertyDescription = ({ text }: PropertyDescriptionProps) => {
  const paragraphs = descriptionParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <section aria-labelledby="property-description-title">
      <h2 id="property-description-title" className="text-xl font-bold">
        Опис
      </h2>
      <div className="mt-3 flex max-w-prose flex-col gap-4 text-base leading-relaxed">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="break-words whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
};

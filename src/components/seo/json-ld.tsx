type JsonLdProps = { data: Record<string, unknown> };

/**
 * Renders one schema.org JSON-LD block. `<` is escaped so a value like `</script>` in listing text
 * cannot close the tag (the result is still valid JSON).
 */
export const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);

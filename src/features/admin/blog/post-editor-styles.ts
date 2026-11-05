/**
 * Typography of the editing area: the same look as the site's article (`src/features/pages/markdown.tsx` COMPONENTS),
 * written as descendant selectors because ProseMirror renders plain elements. Keep both in sync.
 */
export const POST_EDITOR_PROSE = [
  "text-base text-muted-foreground",
  "[&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:first:mt-0 sm:[&_h2]:text-2xl",
  "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-heading [&_h3]:text-base [&_h3]:leading-snug [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground [&_h3]:first:mt-0 sm:[&_h3]:text-lg",
  "[&_p]:mb-4 [&_p]:leading-7 [&_p:last-child]:mb-0",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:marker:text-dawn-text",
  "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:marker:font-semibold [&_ol]:marker:text-dawn-text",
  "[&_li]:leading-7 [&_li_p]:mb-0",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-dawn [&_blockquote]:pl-4 [&_blockquote]:text-foreground [&_blockquote_p]:mb-0",
  "[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic",
  "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-dawn [&_a]:decoration-2 [&_a]:underline-offset-4",
].join(" ");

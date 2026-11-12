import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { isAllowedLinkHref } from "./post-link";

/**
 * The TipTap setup of the blog editor and of the Markdown round-trip test. Only what the site's Markdown renderer
 * shows: headings h2 / h3, bold, italic, bullet / ordered lists, quote, link, hard break. No images, code, strike.
 */
export const createPostExtensions = () => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
      defaultProtocol: "https",
      isAllowedUri: (url) => isAllowedLinkHref(url),
      HTMLAttributes: { rel: "noopener noreferrer nofollow" },
    },
  }),
  Markdown,
];

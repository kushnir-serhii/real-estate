/** Link targets the blog editor accepts: `http(s)://`, a site-relative `/path`, `mailto:` and `tel:`. */
const ALLOWED_LINK = /^(?:https?:\/\/[^\s/]+\S*|\/(?!\/)\S*|mailto:[^\s@]+@[^\s@]+|tel:\+?[\d\s()-]+)$/i;

export const isAllowedLinkHref = (href: string): boolean => ALLOWED_LINK.test(href.trim());

/** Trims and returns the href when allowed; a bare `site.ua/page` gets `https://` first. */
export const normalizeLinkHref = (value: string): string | null => {
  const href = value.trim();
  if (href === "") return null;
  if (isAllowedLinkHref(href)) return href;
  const withProtocol = /^[^\s/:@]+\.[^\s/:@]+/.test(href) ? `https://${href}` : href;
  return isAllowedLinkHref(withProtocol) ? withProtocol : null;
};

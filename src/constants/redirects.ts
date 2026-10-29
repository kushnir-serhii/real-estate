export type Redirect = { from: string; to: string };

// Mock — filled once the list of old WordPress URLs is known (paths only, e.g. { from: "/old-page", to: "/catalog" }).
export const OLD_SITE_REDIRECTS: readonly Redirect[] = [];

const PROTECTED_PREFIXES = ["/admin", "/api"];

const normalize = (pathname: string): string => {
  const path = pathname.split(/[?#]/)[0].toLowerCase();
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return trimmed || "/";
};

const isProtected = (path: string) =>
  PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/** Target of a permanent redirect for an old path (case and trailing slash ignored), else null. Never touches /admin or /api. */
export const findRedirect = (pathname: string, list: readonly Redirect[] = OLD_SITE_REDIRECTS): string | null => {
  const path = normalize(pathname);
  if (isProtected(path)) return null;
  return list.find((entry) => normalize(entry.from) === path)?.to ?? null;
};

const PATTERN_SPECIAL = new Set(["(", ")", "[", "]", "{", "}", ":", "*", "+", "?", "\\"]);

const escapePattern = (path: string) =>
  [...path].map((char) => (PATTERN_SPECIAL.has(char) ? "\\" + char : char)).join("");

/** `redirects()` entries for next.config: permanent, literal paths (Next matches case-insensitively and without a trailing slash). */
export const toNextRedirects = (list: readonly Redirect[] = OLD_SITE_REDIRECTS) =>
  list
    .filter((entry) => !isProtected(normalize(entry.from)))
    .map((entry) => ({
      source: escapePattern(normalize(entry.from)),
      destination: entry.to,
      permanent: true as const,
    }));

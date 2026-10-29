const PROPERTY_PATH = /^\/catalog\/([^/]+)\/?$/;

/** The property slug when the page is a property page (`/catalog/<slug>`), else undefined. */
export const propertySlugFromPath = (pathname: string): string | undefined => {
  const match = PROPERTY_PATH.exec(pathname);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

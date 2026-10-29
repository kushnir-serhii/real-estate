import { describe, expect, it } from "vitest";

import { findRedirect, OLD_SITE_REDIRECTS, toNextRedirects } from "./redirects";

const LIST = [
  { from: "/Old-Page/", to: "/catalog" },
  { from: "/admin/old", to: "/" },
];

describe("redirects", () => {
  it("is empty by default", () => {
    expect(OLD_SITE_REDIRECTS).toHaveLength(0);
    expect(findRedirect("/anything")).toBeNull();
    expect(toNextRedirects()).toEqual([]);
  });

  it("matches ignoring case and trailing slash", () => {
    expect(findRedirect("/old-page", LIST)).toBe("/catalog");
    expect(findRedirect("/OLD-PAGE/", LIST)).toBe("/catalog");
    expect(findRedirect("/old-page?x=1", LIST)).toBe("/catalog");
    expect(findRedirect("/other", LIST)).toBeNull();
  });

  it("never matches /admin or /api", () => {
    expect(findRedirect("/admin/old", LIST)).toBeNull();
    expect(findRedirect("/api/x", [{ from: "/api/x", to: "/" }])).toBeNull();
    expect(toNextRedirects(LIST)).toEqual([{ source: "/old-page", destination: "/catalog", permanent: true }]);
  });
});

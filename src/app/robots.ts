import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

// `/_next/` stays crawlable: Google needs the CSS/JS to render pages. Filtered catalog URLs are not blocked
// either, so crawlers can read their `noindex, follow`.
const robots = (): MetadataRoute.Robots => {
  const siteUrl = getSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
};

export default robots;

import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { toNextRedirects } from "./src/constants/redirects";
import { assertBuildEnv, demoBuildWarnings } from "./src/lib/build-guard";

const nextConfig: NextConfig = {
  redirects: async () => toNextRedirects(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const createConfig = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const driver = assertBuildEnv();
    // The config is loaded by several build processes: say it once.
    if (driver === "demo" && process.env.DIPLOMAT_HALL_BUILD_LOGGED !== "1") {
      process.env.DIPLOMAT_HALL_BUILD_LOGGED = "1";
      console.log("[demo mode] building on mock data (DATA_DRIVER=demo): no Supabase, Cloudflare or keys needed.");
      for (const warning of demoBuildWarnings()) console.warn(`[demo mode] ${warning}`);
    }
  }
  return nextConfig;
};

export default createConfig;

initOpenNextCloudflareForDev();

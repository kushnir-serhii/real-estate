import { describe, expect, it } from "vitest";

import { assertBuildEnv, demoBuildWarnings } from "./build-guard";

const SUPABASE_ENV = { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" };

describe("assertBuildEnv", () => {
  it("passes on the demo driver with no env at all", () => {
    expect(assertBuildEnv({})).toBe("demo");
    expect(assertBuildEnv({ DATA_DRIVER: "demo", ...SUPABASE_ENV })).toBe("demo");
  });

  it("fails on the supabase driver without its public env", () => {
    expect(() => assertBuildEnv({ DATA_DRIVER: "supabase" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => assertBuildEnv({ DATA_DRIVER: "supabase", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toThrow(
      /ANON_KEY/,
    );
  });

  it("passes on the supabase driver (explicit or auto) with its env", () => {
    expect(assertBuildEnv({ DATA_DRIVER: "supabase", ...SUPABASE_ENV })).toBe("supabase");
    expect(assertBuildEnv(SUPABASE_ENV)).toBe("supabase");
  });

  it("rejects an invalid DATA_DRIVER", () => {
    expect(() => assertBuildEnv({ DATA_DRIVER: "mongo" })).toThrow(/Invalid DATA_DRIVER/);
  });

  it("warns about a missing site URL on a demo build only when it matters", () => {
    expect(demoBuildWarnings({})).toHaveLength(1);
    expect(demoBuildWarnings({ NEXT_PUBLIC_SITE_URL: "nope" })).toHaveLength(1);
    expect(demoBuildWarnings({ NEXT_PUBLIC_SITE_URL: "https://diplomathall.example" })).toEqual([]);
    expect(demoBuildWarnings({ SEO_ALLOW_LOCALHOST: "1" })).toEqual([]);
  });
});

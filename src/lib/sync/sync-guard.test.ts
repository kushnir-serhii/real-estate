import { describe, expect, it } from "vitest";
import { decideSync } from "./sync-guard";

describe("decideSync", () => {
  it("demo driver gets the notice", () => {
    expect(decideSync({ demo: true, apiKey: "", fixtures: false })).toEqual({ action: "demo" });
  });

  it("refuses with code 1 on supabase without a key", () => {
    expect(decideSync({ demo: false, apiKey: "  ", fixtures: false })).toMatchObject({ action: "stop", code: 1 });
    expect(decideSync({ demo: false, apiKey: undefined, fixtures: false })).toMatchObject({ action: "stop", code: 1 });
  });

  it("runs fixtures on purpose without a key", () => {
    expect(decideSync({ demo: false, apiKey: "", fixtures: true })).toEqual({ action: "run" });
  });

  it("rejects --fixtures with a key (code 2)", () => {
    expect(decideSync({ demo: false, apiKey: "k", fixtures: true })).toMatchObject({ action: "stop", code: 2 });
  });

  it("runs with a key", () => {
    expect(decideSync({ demo: false, apiKey: "k", fixtures: false })).toEqual({ action: "run" });
  });
});

import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps a type-scale size next to a text colour", () => {
    expect(cn("text-h3", "text-muted-foreground")).toBe("text-h3 text-muted-foreground");
    expect(cn("text-price", "text-foreground")).toBe("text-price text-foreground");
  });

  it("lets a later font size replace a type-scale size", () => {
    expect(cn("text-h2", "text-lg")).toBe("text-lg");
  });
});

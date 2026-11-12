import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DiagramsError, checkDescription, hashSource, parseDiagramsDoc } from "./parse";

const read = (file: string): string => readFileSync(resolve(process.cwd(), file), "utf8");

describe("docs/diagrams.html", () => {
  it("is generated from the current docs/diagrams.md (run `pnpm diagrams` and commit both files)", () => {
    const html = read("docs/diagrams.html");
    const stored = /<meta name="diagrams-source-sha256" content="([0-9a-f]{64})">/.exec(html)?.[1];
    expect(stored, "docs/diagrams.html has no source hash: run `pnpm diagrams` and commit both files").toBeDefined();
    expect(
      stored,
      "docs/diagrams.md changed after docs/diagrams.html was generated: run `pnpm diagrams` and commit both files",
    ).toBe(hashSource(read("docs/diagrams.md")));
  });

  it("parses: every diagram has block rows", () => {
    const diagrams = parseDiagramsDoc(read("docs/diagrams.md")).sections.filter((section) => section.diagram);
    expect(diagrams).toHaveLength(12);
    for (const section of diagrams) expect(section.diagram?.blocks.length).toBeGreaterThan(0);
  });
});

describe("hashSource", () => {
  it("ignores line endings", () => {
    expect(hashSource("a\r\nb\n")).toBe(hashSource("a\nb\n"));
  });
});

describe("checkDescription", () => {
  it("accepts one plain sentence and rejects the rest", () => {
    expect(checkDescription("A person browsing the catalog.")).toBeNull();
    expect(checkDescription("")).toMatch(/empty/);
    expect(checkDescription("x".repeat(140))).toBeNull();
    expect(checkDescription("x".repeat(141))).toMatch(/141 characters/);
    expect(checkDescription("Uses `code`.")).toMatch(/plain text/);
    expect(checkDescription("One. Two.")).toMatch(/one sentence/);
  });
});

describe("parseDiagramsDoc", () => {
  const doc = (table: string): string =>
    ["# T", "## 1. D", "```mermaid", "flowchart LR", "  a[A]", "```", table].join("\n");
  const header = "| Block | Data | What it is | Code |\n| --- | --- | --- | --- |";

  it("reads a diagram and its rows", () => {
    const parsed = parseDiagramsDoc(doc(`${header}\n| \`a\` | mock | A block. | — |`));
    expect(parsed.sections[0].diagram?.blocks).toEqual([{ block: "a", data: "mock", description: "A block.", code: "—" }]);
  });

  it("fails on a missing table, an unknown marker and a duplicate row", () => {
    expect(() => parseDiagramsDoc(doc(""))).toThrow(DiagramsError);
    expect(() => parseDiagramsDoc(doc(`${header}\n| a | live | A block. | — |`))).toThrow(/real, mock, seam/);
    expect(() => parseDiagramsDoc(doc(`${header}\n| a | mock | A. | — |\n| a | mock | B. | — |`))).toThrow(/two rows/);
  });

  it("fails on a description over 140 characters", () => {
    expect(() => parseDiagramsDoc(doc(`${header}\n| a | mock | ${"x".repeat(141)} | — |`))).toThrow(/limit is 140/);
  });
});

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PAGE_SCRIPT } from "./diagrams/page-script";
import { DiagramsError, hashSource, normalizeSource, parseDiagramsDoc } from "./diagrams/parse";
import type { Diagram, Section } from "./diagrams/parse";
import { buildViewerHtml } from "./diagrams/viewer";
import type { RenderedDiagram } from "./diagrams/viewer";

/**
 * `pnpm diagrams`: docs/diagrams.md -> docs/diagrams.html.
 * Renders every Mermaid block in headless Chromium (Mermaid is loaded from node_modules, nothing is downloaded),
 * attaches the «Blocks» descriptions as tooltips and writes one self-contained HTML file.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Optional arguments (used to check the generator on a fixture): `pnpm diagrams <source.md> <output.html>`.
const SOURCE_PATH = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "docs/diagrams.md");
const OUTPUT_PATH = process.argv[3] ? resolve(process.argv[3]) : resolve(root, "docs/diagrams.html");

/** The marker colours for the dark copy of each diagram; the light ones live in the classDef lines of the Markdown. */
const DARK_CLASS_DEFS: Record<string, string> = {
  real: "fill:#1e3a8a,stroke:#93c5fd,color:#e0ecff",
  mock: "fill:#78350f,stroke:#fcd34d,color:#fff3d1,stroke-dasharray:5 4",
  seam: "fill:#4c1d95,stroke:#c4b5fd,color:#f1eaff",
  person: "fill:#374151,stroke:#9ca3af,color:#f9fafb",
};

const toDarkSource = (source: string): string =>
  source.replace(/^(\s*)classDef\s+(\w+)\s+.*$/gm, (line, indent: string, name: string) => {
    const dark = DARK_CLASS_DEFS[name];
    return dark ? `${indent}classDef ${name} ${dark}` : line;
  });

type FoundBlock = { name: string; label: string };
type Annotated = { html: string; found: FoundBlock[] };

const renderSvg = (page: Page, id: string, source: string, scheme: "light" | "dark"): Promise<string> =>
  page.evaluate(
    ([svgId, text, mode]) => {
      const holder = window as unknown as { diagramsPage: { render: (a: string, b: string, c: string) => Promise<string> } };
      return holder.diagramsPage.render(svgId, text, mode);
    },
    [id, source, scheme] as const,
  );

const annotateSvg = (page: Page, svg: string, diagram: Diagram, id: string, label: string): Promise<Annotated> =>
  page.evaluate(
    ([markup, kind, svgId, rows, aria]) => {
      const holder = window as unknown as {
        diagramsPage: { annotate: (...args: unknown[]) => { html: string; found: { name: string; label: string }[] } };
      };
      return holder.diagramsPage.annotate(markup, kind, svgId, rows, aria);
    },
    [svg, diagram.kind, id, diagram.blocks, label] as const,
  );

/** Fails with the diagram and block names when the diagram and its table do not match, or a marker is not in the label. */
const checkBlocks = (section: Section, diagram: Diagram, found: FoundBlock[]): void => {
  const problems: string[] = [];
  const foundNames = new Set(found.map((block) => block.name));
  for (const block of found) {
    if (!diagram.blocks.some((row) => row.block === block.name)) {
      problems.push(`block "${block.name}" is in the diagram but has no row in the Blocks table`);
    }
  }
  for (const row of diagram.blocks) {
    if (!foundNames.has(row.block)) {
      problems.push(`row "${row.block}" is in the Blocks table but matches no block in the diagram`);
      continue;
    }
    const label = found.find((block) => block.name === row.block)?.label ?? "";
    if (row.data !== "—" && !new RegExp(`\\b${row.data}\\b`, "i").test(label)) {
      problems.push(`block "${row.block}" is marked ${row.data} in the table but its label does not show "${row.data}"`);
    }
  }
  if (problems.length > 0) {
    throw new DiagramsError(`Diagram "${section.title}":\n  - ${problems.join("\n  - ")}`);
  }
};

const main = async (): Promise<void> => {
  const source = normalizeSource(readFileSync(SOURCE_PATH, "utf8"));
  const doc = parseDiagramsDoc(source);
  const diagramSections = doc.sections.filter((section) => section.diagram !== null);
  if (diagramSections.length === 0) throw new DiagramsError("docs/diagrams.md has no diagram");

  const require = createRequire(import.meta.url);
  const mermaidPath = require.resolve("mermaid/dist/mermaid.min.js");

  const browser = await chromium.launch();
  const rendered = new Map<string, RenderedDiagram>();
  try {
    const page = await browser.newPage();
    const requests: string[] = [];
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("about:") || url.startsWith("data:")) return route.continue();
      requests.push(url);
      return route.abort();
    });
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ path: mermaidPath });
    await page.addScriptTag({ content: PAGE_SCRIPT });

    for (const [index, section] of diagramSections.entries()) {
      const diagram = section.diagram;
      if (!diagram) continue;
      const label = `Diagram: ${section.title}`;
      const lightId = `diagram-${index + 1}-light`;
      const darkId = `diagram-${index + 1}-dark`;
      let light: Annotated;
      let dark: Annotated;
      try {
        light = await annotateSvg(page, await renderSvg(page, lightId, diagram.source, "light"), diagram, lightId, label);
        dark = await annotateSvg(page, await renderSvg(page, darkId, toDarkSource(diagram.source), "dark"), diagram, darkId, label);
      } catch (error) {
        throw new DiagramsError(`Diagram "${section.title}": Mermaid failed to render it: ${error instanceof Error ? error.message : String(error)}`);
      }
      checkBlocks(section, diagram, light.found);
      checkBlocks(section, diagram, dark.found);
      rendered.set(section.id, { light: light.html, dark: dark.html });
      console.log(`diagram ${index + 1} "${section.title}" (${diagram.kind}): ${diagram.blocks.length} blocks`);
    }
    if (requests.length > 0) throw new DiagramsError(`The renderer tried to reach the network: ${requests.join(", ")}`);
  } finally {
    await browser.close();
  }

  const html = buildViewerHtml(doc, hashSource(source), rendered);
  writeFileSync(OUTPUT_PATH, html.replace(/\r\n/g, "\n"), "utf8");
  console.log(`wrote ${OUTPUT_PATH} (${Math.round(html.length / 1024)} KB)`);
};

main().catch((error: unknown) => {
  console.error(error instanceof DiagramsError ? `pnpm diagrams: ${error.message}` : error);
  process.exit(1);
});

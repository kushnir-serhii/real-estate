import { createHash } from "node:crypto";

/** Pure parsing of `docs/diagrams.md`: no browser, no file system, so a test can import it. */

export const MARKERS = ["real", "mock", "seam"] as const;
export type Marker = (typeof MARKERS)[number];
export type DataMarker = Marker | "—";

export const MAX_DESCRIPTION_LENGTH = 140;
export const BLOCKS_HEADER = ["Block", "Data", "What it is", "Code"] as const;

export type DiagramKind = "flowchart" | "class" | "sequence" | "state";

export type MdToken =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "code"; lang: string; text: string };

type TableToken = Extract<MdToken, { kind: "table" }>;
type CodeToken = Extract<MdToken, { kind: "code" }>;

export type BlockRow = { block: string; data: DataMarker; description: string; code: string };

export type Diagram = { kind: DiagramKind; source: string; blocks: BlockRow[] };

export type Section = { id: string; title: string; tokens: MdToken[]; diagram: Diagram | null };

export type DiagramsDoc = { title: string; intro: MdToken[]; sections: Section[] };

/** Line endings are normalised so the hash does not depend on the OS or on git's autocrlf. */
export const normalizeSource = (text: string): string => text.replace(/\r\n?/g, "\n");

export const hashSource = (text: string): string =>
  createHash("sha256").update(normalizeSource(text), "utf8").digest("hex");

export class DiagramsError extends Error {}

const FENCE_OPEN = /^```\s*([\w-]*)\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

const splitRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
};

/** Block-level Markdown subset used by the file: headings, paragraphs, lists, tables, fenced code. */
export const tokenize = (source: string): MdToken[] => {
  const lines = normalizeSource(source).split("\n");
  const tokens: MdToken[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE_CLOSE.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new DiagramsError("Unclosed code fence in docs/diagrams.md");
      index += 1;
      tokens.push({ kind: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      tokens.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (line.trim().startsWith("|") && index + 1 < lines.length && TABLE_SEPARATOR.test(lines[index + 1].trim())) {
      const header = splitRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      tokens.push({ kind: "table", header, rows });
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const ordered = /\d/.test(LIST_ITEM.exec(line)?.[2] ?? "");
      const items: string[] = [];
      while (index < lines.length) {
        const match = LIST_ITEM.exec(lines[index]);
        if (match) {
          items.push(match[3]);
        } else if (/^\s{2,}\S/.test(lines[index]) && items.length > 0) {
          items[items.length - 1] += ` ${lines[index].trim()}`;
        } else {
          break;
        }
        index += 1;
      }
      tokens.push({ kind: "list", ordered, items });
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !FENCE_OPEN.test(lines[index]) &&
      !HEADING.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    tokens.push({ kind: "paragraph", text: paragraph.join(" ") });
  }
  return tokens;
};

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** First meaningful line of a Mermaid source decides the diagram kind. */
export const detectKind = (source: string): DiagramKind | null => {
  let inFrontmatter = false;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    if (line === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter || line.startsWith("%%")) continue;
    if (/^(flowchart|graph)\b/.test(line)) return "flowchart";
    if (/^classDiagram\b/.test(line)) return "class";
    if (/^sequenceDiagram\b/.test(line)) return "sequence";
    if (/^stateDiagram(-v2)?\b/.test(line)) return "state";
    return null;
  }
  return null;
};

export const hasBlocksHeader = (header: string[]): boolean =>
  header.length === BLOCKS_HEADER.length && BLOCKS_HEADER.every((name, i) => header[i].toLowerCase() === name.toLowerCase());

export const isBlocksTable = (token: MdToken): token is TableToken =>
  token.kind === "table" && hasBlocksHeader(token.header);

const isDataMarker = (value: string): value is DataMarker =>
  value === "—" || (MARKERS as readonly string[]).includes(value);

const stripTicks = (value: string): string => value.replace(/^`+|`+$/g, "").trim();

/** One sentence, plain text, at most 140 characters (it is the tooltip). Returns the problem, or null. */
export const checkDescription = (description: string): string | null => {
  if (description === "") return "is empty";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `is ${description.length} characters long (the limit is ${MAX_DESCRIPTION_LENGTH})`;
  }
  if (/[`<>]/.test(description)) return "must be plain text (no backticks or HTML)";
  if (/[.!?…]\s+\S/.test(description)) return "must be one sentence";
  return null;
};

const parseBlockRows = (title: string, table: TableToken): BlockRow[] => {
  const seen = new Set<string>();
  return table.rows.map((cells) => {
    if (cells.length !== BLOCKS_HEADER.length) {
      throw new DiagramsError(
        `Diagram "${title}": a Blocks row has ${cells.length} cells, expected ${BLOCKS_HEADER.length}: | ${cells.join(" | ")} |`,
      );
    }
    const block = stripTicks(cells[0]);
    const data = stripTicks(cells[1]);
    const description = cells[2];
    if (block === "") throw new DiagramsError(`Diagram "${title}": a Blocks row has an empty Block`);
    if (seen.has(block)) throw new DiagramsError(`Diagram "${title}": block "${block}" has two rows`);
    seen.add(block);
    if (!isDataMarker(data)) {
      throw new DiagramsError(`Diagram "${title}", block "${block}": Data must be real, mock, seam or —, got "${data}"`);
    }
    const problem = checkDescription(description);
    if (problem) throw new DiagramsError(`Diagram "${title}", block "${block}": "What it is" ${problem}`);
    return { block, data, description, code: cells[3] };
  });
};

/** Splits the file into the title, the intro and `##` sections; a section with a mermaid block is a diagram. */
export const parseDiagramsDoc = (source: string): DiagramsDoc => {
  const tokens = tokenize(source);
  const first = tokens[0];
  if (!first || first.kind !== "heading" || first.level !== 1) {
    throw new DiagramsError("docs/diagrams.md must start with a single # title");
  }
  const intro: MdToken[] = [];
  const sections: Section[] = [];
  const ids = new Set<string>();
  for (const token of tokens.slice(1)) {
    if (token.kind === "heading" && token.level === 2) {
      const id = slugify(token.text);
      if (id === "" || ids.has(id)) {
        throw new DiagramsError(`Section heading "${token.text}" gives an empty or duplicate id`);
      }
      ids.add(id);
      sections.push({ id, title: token.text, tokens: [], diagram: null });
    } else if (sections.length === 0) {
      intro.push(token);
    } else {
      sections[sections.length - 1].tokens.push(token);
    }
  }
  for (const section of sections) {
    const mermaid = section.tokens.filter((t): t is CodeToken => t.kind === "code" && t.lang === "mermaid");
    if (mermaid.length === 0) continue;
    if (mermaid.length > 1) {
      throw new DiagramsError(`Section "${section.title}" has ${mermaid.length} mermaid blocks, expected one`);
    }
    const tables = section.tokens.filter(isBlocksTable);
    if (tables.length !== 1) {
      throw new DiagramsError(
        `Diagram "${section.title}" needs exactly one "| ${BLOCKS_HEADER.join(" | ")} |" table, found ${tables.length}`,
      );
    }
    const kind = detectKind(mermaid[0].text);
    if (!kind) {
      throw new DiagramsError(
        `Diagram "${section.title}": unsupported Mermaid type (use flowchart, classDiagram, sequenceDiagram or stateDiagram-v2)`,
      );
    }
    section.diagram = { kind, source: mermaid[0].text, blocks: parseBlockRows(section.title, tables[0]) };
  }
  return { title: first.text, intro, sections };
};

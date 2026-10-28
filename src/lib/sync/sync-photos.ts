import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FIXTURE_PHOTO_BASE_URL } from "@/lib/plektan/fixtures/data";
import { deleteObjects, putObject } from "@/lib/r2";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Photo step of the sync (Node only: `sharp` can't run on Workers, so never import this from `src/app`).
 * Properties: Plektan URL -> WebP at 480 / 960 / 1600 px (never upscaled) -> R2
 * `properties/<property_id>/<hash>-<w>.webp`; `property_photos` follows Plektan's order.
 * Agents: `agents/<agent_id>-<hash>.webp`, 256 px.
 */

type Admin = ReturnType<typeof createAdminClient>;

export const PHOTO_WIDTHS = [480, 960, 1600] as const;
const MAIN_WIDTH = 960;
const AGENT_WIDTH = 256;
const WEBP_QUALITY = 80;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
/** Parking position while rows swap places (`unique (property_id, position)`). */
const PARKING_OFFSET = 100_000;
const AGENT_FIXTURE_BASE_URL = "https://plektan.example/agents";

export type PhotoStats = {
  /** Photos fetched from Plektan (or the local fixture files). */
  downloaded: number;
  /** Objects written to R2 (three per property photo). */
  uploaded: number;
  /** Photo rows removed because Plektan no longer lists them. */
  deleted: number;
  /** Photos that could not be fetched / converted / stored; retried next run. */
  failed: number;
};

export const createPhotoStats = (): PhotoStats => ({ downloaded: 0, uploaded: 0, deleted: 0, failed: 0 });

type Log = (message: string) => void;

const shortHash = (value: string): string => createHash("sha1").update(value).digest("hex").slice(0, 10);

const isPlektanFixtureMode = (): boolean => (process.env.PLEKTAN_API_KEY?.trim() ?? "") === "";

// ---- download ---------------------------------------------------------------

const readFixtureFile = async (url: string): Promise<Buffer | null> => {
  if (url.startsWith(`${FIXTURE_PHOTO_BASE_URL}/`)) {
    const name = path.basename(url.slice(FIXTURE_PHOTO_BASE_URL.length + 1)).replace(/\.[a-z]+$/i, "");
    if (!/^[a-z0-9-]+$/i.test(name)) throw new Error("unexpected fixture photo name");
    return readFile(path.join(process.cwd(), "public", "placeholders", `${name}.webp`));
  }
  if (url.startsWith(`${AGENT_FIXTURE_BASE_URL}/`)) {
    // No local file for people: a plain square stands in.
    return sharp({ create: { width: 512, height: 512, channels: 3, background: "#9aa5b1" } })
      .png()
      .toBuffer();
  }
  return null;
};

const download = async (url: string): Promise<Buffer> => {
  if (isPlektanFixtureMode()) {
    const local = await readFixtureFile(url);
    if (local !== null) return local;
  }
  if (!/^https?:\/\//i.test(url)) throw new Error("not an http(s) URL");
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("image/")) throw new Error("not an image");
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_DOWNLOAD_BYTES) throw new Error("image too large");
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_DOWNLOAD_BYTES) throw new Error("image too large");
  return body;
};

const describeError = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

// ---- property photos --------------------------------------------------------

type StoredPhoto = {
  id: string;
  position: number;
  r2_key: string;
  sizes: Json | null;
  source_url: string | null;
};

type NewPhoto = {
  source_url: string;
  r2_key: string;
  width: number;
  height: number;
  sizes: Record<string, string>;
};

const keysOf = (photo: Pick<StoredPhoto, "r2_key" | "sizes">): string[] => {
  const keys = new Set<string>([photo.r2_key]);
  const sizes = photo.sizes;
  if (typeof sizes === "object" && sizes !== null && !Array.isArray(sizes)) {
    for (const value of Object.values(sizes)) if (typeof value === "string") keys.add(value);
  }
  // The seed's placeholders live in the repo's public/, not in R2: never delete those.
  return [...keys].filter((key) => key.startsWith("properties/"));
};

const buildPhoto = async (propertyId: string, source: string, stats: PhotoStats): Promise<NewPhoto> => {
  const original = await download(source);
  stats.downloaded += 1;
  const hash = shortHash(source);
  // Real width after EXIF rotation (orientation 5-8 swaps the axes).
  const meta = await sharp(original).metadata();
  const sourceWidth = (meta.orientation ?? 1) >= 5 ? meta.height : meta.width;
  if (sourceWidth === undefined || sourceWidth <= 0) throw new Error("unreadable image size");
  // Sizes are keyed by the real output width; nominal widths above the source collapse into one.
  const widths = [...new Set(PHOTO_WIDTHS.map((width) => Math.min(width, sourceWidth)))];
  const sizes: Record<string, string> = {};
  const outputs: { width: number; height: number; key: string }[] = [];
  for (const width of widths) {
    const { data, info } = await sharp(original)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const key = `properties/${propertyId}/${hash}-${info.width}.webp`;
    await putObject(key, data, "image/webp");
    stats.uploaded += 1;
    sizes[String(info.width)] = key;
    outputs.push({ width: info.width, height: info.height, key });
  }
  const largest = outputs[outputs.length - 1];
  // Main image: the 960 one, else the largest not over 960, else the smallest.
  const main =
    outputs.find((output) => output.width === MAIN_WIDTH) ??
    [...outputs].reverse().find((output) => output.width < MAIN_WIDTH) ??
    outputs[0];
  if (largest === undefined || main === undefined) throw new Error("no output sizes");
  return { source_url: source, r2_key: main.key, width: largest.width, height: largest.height, sizes };
};

export type PropertyPhotosResult = {
  /** Rows were added, removed or reordered (the property page needs a cache refresh). */
  changed: boolean;
  /** Photos that failed this run; the caller marks the property for a retry. */
  failed: number;
};

/**
 * Makes `property_photos` of one property match Plektan's list. Photos whose `source_url` is stored
 * are kept untouched (no download, no upload); new ones are converted and uploaded; missing ones
 * are deleted (row, then objects). A photo that fails is left out and counted, never thrown.
 */
export const syncPropertyPhotos = async (
  admin: Admin,
  propertyId: string,
  sources: readonly string[],
  stats: PhotoStats,
  log: Log,
): Promise<PropertyPhotosResult> => {
  const wanted = [...new Set(sources)];
  const { data, error } = await admin
    .from("property_photos")
    .select("id, position, r2_key, sizes, source_url")
    .eq("property_id", propertyId)
    .order("position");
  if (error) throw new Error(`sync: loading photos failed: ${error.message}`);
  const stored = new Map<string, StoredPhoto>();
  for (const row of data) if (row.source_url !== null && !stored.has(row.source_url)) stored.set(row.source_url, row);

  // Final order = Plektan's, minus photos that failed now.
  const finalList: ({ kind: "kept"; row: StoredPhoto } | { kind: "new"; photo: NewPhoto })[] = [];
  let failed = 0;
  for (const source of wanted) {
    const existing = stored.get(source);
    if (existing !== undefined) {
      finalList.push({ kind: "kept", row: existing });
      continue;
    }
    try {
      finalList.push({ kind: "new", photo: await buildPhoto(propertyId, source, stats) });
    } catch (photoError) {
      failed += 1;
      stats.failed += 1;
      log(`sync: photo of property ${propertyId} failed: ${describeError(photoError)}`);
    }
  }

  const keptIds = new Set(finalList.flatMap((entry) => (entry.kind === "kept" ? [entry.row.id] : [])));
  const removed = data.filter((row) => !keptIds.has(row.id));
  let changed = false;

  if (removed.length > 0) {
    const { error: deleteError } = await admin.from("property_photos").delete().in("id", removed.map((row) => row.id));
    if (deleteError) throw new Error(`sync: deleting photos failed: ${deleteError.message}`);
    stats.deleted += removed.length;
    changed = true;
    await deleteObjects(removed.flatMap(keysOf));
  }

  // Kept rows whose position changes move through a parking slot, so the unique constraint never trips.
  const moves = finalList.flatMap((entry, position) =>
    entry.kind === "kept" && entry.row.position !== position ? [{ id: entry.row.id, position }] : [],
  );
  for (const move of moves) {
    const { error: parkError } = await admin
      .from("property_photos")
      .update({ position: PARKING_OFFSET + move.position })
      .eq("id", move.id);
    if (parkError) throw new Error(`sync: moving photos failed: ${parkError.message}`);
  }
  for (const move of moves) {
    const { error: moveError } = await admin.from("property_photos").update({ position: move.position }).eq("id", move.id);
    if (moveError) throw new Error(`sync: moving photos failed: ${moveError.message}`);
    changed = true;
  }

  const inserts = finalList.flatMap((entry, position) =>
    entry.kind === "new" ? [{ property_id: propertyId, position, ...entry.photo }] : [],
  );
  if (inserts.length > 0) {
    const { error: insertError } = await admin.from("property_photos").insert(inserts);
    if (insertError) throw new Error(`sync: inserting photos failed: ${insertError.message}`);
    changed = true;
  }

  return { changed, failed };
};

// ---- agent photos -----------------------------------------------------------

export type AgentPhotoInput = { id: string; url: string | null };

/**
 * Copies each agent's Plektan photo once: the key carries a hash of the source URL, so an unchanged
 * URL is skipped and a changed one produces a new key (the old object is removed).
 * Returns true when any agent's `photo_url` changed.
 */
export const syncAgentPhotos = async (
  admin: Admin,
  agents: readonly AgentPhotoInput[],
  stats: PhotoStats,
  log: Log,
): Promise<boolean> => {
  const withUrl = agents.filter((agent): agent is { id: string; url: string } => agent.url !== null && agent.url !== "");
  if (withUrl.length === 0) return false;
  const { data, error } = await admin.from("agents").select("id, photo_url").in("id", withUrl.map((agent) => agent.id));
  if (error) throw new Error(`sync: loading agent photos failed: ${error.message}`);
  const current = new Map(data.map((row) => [row.id, row.photo_url]));

  let changed = false;
  for (const agent of withUrl) {
    const key = `agents/${agent.id}-${shortHash(agent.url)}.webp`;
    const previous = current.get(agent.id) ?? null;
    if (previous === key) continue;
    try {
      const original = await download(agent.url);
      stats.downloaded += 1;
      const body = await sharp(original)
        .rotate()
        .resize({ width: AGENT_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      await putObject(key, body, "image/webp");
      stats.uploaded += 1;
      const { error: updateError } = await admin.from("agents").update({ photo_url: key }).eq("id", agent.id);
      if (updateError) throw new Error(updateError.message);
      changed = true;
      if (previous !== null && previous.startsWith("agents/")) await deleteObjects([previous]);
    } catch (photoError) {
      stats.failed += 1;
      log(`sync: photo of agent ${agent.id} failed: ${describeError(photoError)}`);
    }
  }
  return changed;
};

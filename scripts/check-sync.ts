/**
 * Repeatable acceptance check for the Plektan sync, against LOCAL Supabase and Plektan fixtures only.
 * `pnpm sync:check` (needs `supabase start`). Exits non-zero on the first failed assertion.
 */
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { FIXTURE_DEFS, FIXTURE_USERS } from "@/lib/plektan/fixtures/data";
import { runSync, type SyncResult, type SyncSummary } from "@/lib/sync/run-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error("sync:check refuses to run: NEXT_PUBLIC_SUPABASE_URL must point to 127.0.0.1 or localhost.");
  process.exit(2);
}
if ((process.env.PLEKTAN_API_KEY ?? "").trim() !== "") {
  console.error("sync:check refuses to run: PLEKTAN_API_KEY is set (the check uses fixtures only).");
  process.exit(2);
}

if (["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].some((name) => (process.env[name] ?? "").trim() !== "")) {
  console.error("sync:check refuses to run: R2_* is set (the check writes to public/r2-local/ only).");
  process.exit(2);
}

const admin = createAdminClient();
let failures = 0;

const check = (name: string, ok: boolean, detail = ""): void => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` (${detail})`}`);
};

const fixtureAdids = [...new Set(Object.values(FIXTURE_DEFS).flatMap((defs) => defs.map((def) => def.adid)))];
const publishable = (set: "base" | "next") => FIXTURE_DEFS[set].filter((def) => def.is_mls !== true);

const must = <T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
  if (result.error !== null || result.data === null || result.data === undefined) {
    throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data;
};

const setSource = async (source: "plektan" | "admin"): Promise<void> => {
  must(await admin.from("settings").update({ properties_source: source }).eq("id", true).select("id"), "set source");
};

const sync = async (
  set: "base" | "next",
  mode: "full" | "incremental" = "full",
  forceHide = false,
): Promise<SyncSummary> => {
  process.env.PLEKTAN_FIXTURE_SET = set;
  const result: SyncResult = await runSync({ mode, forceHide, log: () => undefined });
  if (result.status !== "done") throw new Error(`sync skipped unexpectedly: ${result.reason}`);
  console.log(`      ${set}/${mode}: ${JSON.stringify({ ...result.summary, warnings: undefined })}`);
  return result.summary;
};

type Snapshot = Map<string, { updated_at: string; status: string; price_amount: number | null; slug: string }>;

const snapshot = async (): Promise<Snapshot> => {
  const rows = must(
    await admin
      .from("properties")
      .select("external_id, updated_at, status, price_amount, slug")
      .eq("source", "plektan")
      .in("external_id", fixtureAdids)
      .order("external_id"),
    "snapshot",
  );
  return new Map(rows.map((row) => [row.external_id ?? "", row]));
};

type PhotoRow = { position: number; r2_key: string; width: number | null; height: number | null; sizes: Record<string, string> | null; source_url: string | null };

const photosOf = async (externalId: string): Promise<PhotoRow[]> => {
  const property = must(await admin.from("properties").select("id").eq("source", "plektan").eq("external_id", externalId).single(), "property");
  const rows = must(
    await admin.from("property_photos").select("position, r2_key, width, height, sizes, source_url").eq("property_id", property.id).order("position"),
    "photos",
  );
  // `sizes` is jsonb: the sync always writes { "480": key, ... }.
  return rows.map((row) => ({ ...row, sizes: row.sizes as Record<string, string> | null }));
};

const localFile = (key: string): string => path.join(process.cwd(), "public", "r2-local", ...key.split("/"));
const filesExist = (rows: PhotoRow[]): boolean =>
  rows.every((row) => Object.values(row.sizes ?? {}).length > 0 && Object.values(row.sizes ?? {}).every((key) => existsSync(localFile(key))));
const allKeys = (rows: PhotoRow[]): string[] => rows.flatMap((row) => Object.values(row.sizes ?? {}));

const agentPhotoKeys = async (): Promise<string[]> =>
  must(await admin.from("agents").select("photo_url").eq("source", "plektan").in("external_id", FIXTURE_USERS.map((user) => user.user_id)), "agent photos").flatMap((row) => (row.photo_url === null ? [] : [row.photo_url]));

const agentsStamp = async (): Promise<string> =>
  JSON.stringify(
    must(await admin.from("agents").select("external_id, updated_at, is_active").eq("source", "plektan").order("external_id"), "agents"),
  );

const main = async (): Promise<void> => {
  const original = must(await admin.from("settings").select("properties_source").single(), "settings").properties_source;

  let seedPublished: { id: string; external_id: string | null }[] = [];
  try {
    // Start clean: only the fixture properties (the seed's demo rows are left alone, but a fixture sync hides them).
    // The seed's demo rows (plektan, not fixtures) are hidden by a fixture sync; they are re-published at the end.
    seedPublished = must(
      await admin.from("properties").select("id, external_id").eq("source", "plektan").eq("status", "published"),
      "seed rows",
    ).filter((row) => !fixtureAdids.includes(row.external_id ?? ""));
    must(await admin.from("properties").delete().eq("source", "plektan").in("external_id", fixtureAdids).select("id"), "cleanup");
    must(
      await admin.from("agents").delete().eq("source", "plektan").in("external_id", FIXTURE_USERS.map((user) => user.user_id)).select("id"),
      "agents cleanup",
    );
    must(await admin.from("settings").update({ sync_cursor: null }).eq("id", true).select("id"), "reset cursor");
    await setSource("plektan");

    // 0. a photo that can't be read: logged and counted, the sync still succeeds; the next (incremental) run retries it
    const missing = path.join(process.cwd(), "public", "placeholders", "flat-bedroom-1.webp");
    await rename(missing, `${missing}.bak`);
    let first: SyncSummary;
    try {
      first = await sync("base");
    } finally {
      await rename(`${missing}.bak`, missing);
    }
    check("photo failure: counted, nothing else failed", first.photos.failed > 0 && first.failed === 0, `photos failed ${first.photos.failed}`);
    check("photo failure: the other photos are saved", (await photosOf("1001")).length === 2);
    const retried = await sync("base", "incremental");
    check("photo retry: missing photos are fetched by the next run", retried.photos.failed === 0 && retried.photos.downloaded > 0, `downloaded ${retried.photos.downloaded}`);

    // 1. base (the first run was the one with the unreadable photo)
    check("base: all publishable fixtures added", first.added === publishable("base").length, `${first.added}/${publishable("base").length}`);
    check("base: the MLS item is skipped", first.skipped === FIXTURE_DEFS.base.length - publishable("base").length);
    check("base: nothing failed", first.failed === 0);
    if (seedPublished.length > 0) {
      // Every demo row vanished from the result: the guard must refuse to hide them...
      check("guard: refuses to hide everything", first.hideBlocked && first.hidden === 0);
      // ...unless forced.
      const forced = await sync("base", "full", true);
      check("guard: --force-hide hides them", !forced.hideBlocked && forced.hidden === seedPublished.length, `${forced.hidden}`);
    }
    check("base: agents created", first.agents.added > 0);
    const photos1001 = await photosOf("1001");
    // Expected size keys come from the real width of each placeholder file: min(nominal, width), deduplicated.
    const expectedKeys = async (row: PhotoRow): Promise<string> => {
      const name = (row.source_url ?? "").split("/").pop()?.replace(/\.jpg$/, "") ?? "";
      const real = (await sharp(path.join(process.cwd(), "public", "placeholders", `${name}.webp`)).metadata()).width ?? 0;
      return [...new Set([480, 960, 1600].map((w) => Math.min(w, real)))].sort((x, y) => x - y).join();
    };
    let keysOk = photos1001.length === 3;
    for (const row of photos1001) {
      const got = Object.keys(row.sizes ?? {}).map(Number).sort((x, y) => x - y).join();
      const suffixOk = Object.entries(row.sizes ?? {}).every(([w, key]) => key.endsWith(`-${w}.webp`));
      keysOk &&= got === (await expectedKeys(row)) && suffixOk && row.r2_key === row.sizes?.["960"] && row.width === Math.max(...Object.keys(row.sizes ?? {}).map(Number));
    }
    check("photos: 1001 has 3 rows in Plektan order, size keys are the real widths", keysOk && photos1001.every((row, i) => row.position === i), photos1001.map((row) => Object.keys(row.sizes ?? {}).join("/")).join(" | "));
    check("photos: files exist under public/r2-local/", filesExist(photos1001), photos1001[0]?.r2_key ?? "");
    check("photos: sources recorded, sizes never upscaled", photos1001.every((row) => (row.source_url ?? "").startsWith("https://plektan.example/photos/") && (row.width ?? 0) > 0 && (row.width ?? 0) <= 1600));
    check("photos: a property without photos has none", (await photosOf("1010")).length === 0);
    check("photos: agents copied", (await agentPhotoKeys()).length === 3 && (await agentPhotoKeys()).every((key) => existsSync(localFile(key))));
    const baseAgain = await sync("base");
    const baseRows = await snapshot();
    check("base: re-sync after the retry downloads and uploads nothing", baseAgain.photos.downloaded === 0 && baseAgain.photos.uploaded === 0 && baseAgain.updated === 0);

    // 2. next: 1002 gone, 1001 price changed, 1013 new
    const second = await sync("next");
    const nextRows = await snapshot();
    check("next: removed property becomes hidden", nextRows.get("1002")?.status === "hidden");
    check("next: changed price is updated", nextRows.get("1001")?.price_amount !== baseRows.get("1001")?.price_amount && nextRows.get("1001")?.price_amount != null);
    check("next: slug of the changed one is stable", nextRows.get("1001")?.slug === baseRows.get("1001")?.slug);
    check("next: new property is published", nextRows.get("1013")?.status === "published");
    const photosNext = await photosOf("1001");
    const goneKeys = allKeys(photos1001).filter((key) => !allKeys(photosNext).includes(key));
    check(
      "next: removed photo loses its row and its R2 objects",
      photosNext.length === 2 && goneKeys.length >= 2 && goneKeys.every((key) => !existsSync(localFile(key))) && filesExist(photosNext),
      `${photosNext.length} rows, ${goneKeys.length} objects removed`,
    );
    check(
      "next: remaining photos keep Plektan order (positions 0, 1)",
      photosNext.map((row) => row.source_url).join() === "https://plektan.example/photos/flat-living-1.jpg,https://plektan.example/photos/flat-bedroom-1.jpg" && photosNext.every((row, i) => row.position === i),
    );
    check("next: summary counts the deleted photo", second.photos.deleted === 1, `${second.photos.deleted}`);
    check("next: summary is 1 added / 1 updated / 1 hidden", second.added === 1 && second.updated === 1 && second.hidden === 1, `${second.added}/${second.updated}/${second.hidden}`);

    // 3. same again: nothing is written
    const agentsBefore = await agentsStamp();
    const third = await sync("next");
    const thirdRows = await snapshot();
    const sameStamps = [...nextRows].every(([id, row]) => thirdRows.get(id)?.updated_at === row.updated_at) && thirdRows.size === nextRows.size;
    check("rerun: all unchanged", third.added === 0 && third.updated === 0 && third.hidden === 0 && third.unchanged > 0, `unchanged ${third.unchanged}`);
    check("rerun: no updated_at changed", sameStamps);
    check("rerun: zero photo work", third.photos.downloaded + third.photos.uploaded + third.photos.deleted + third.photos.failed === 0);
    // A forced re-view of 1001 (as a retry would) must find all photos stored and do nothing.
    must(await admin.from("properties").update({ source_updated_at: null }).eq("source", "plektan").eq("external_id", "1001").select("id"), "force re-view");
    const reviewed = await sync("next");
    check("rerun: re-viewed property downloads and uploads nothing", reviewed.updated === 1 && reviewed.photos.downloaded === 0 && reviewed.photos.uploaded === 0 && reviewed.photos.deleted === 0);
    check("rerun: agents untouched", (await agentsStamp()) === agentsBefore);

    // 4. incremental with the stored cursor writes nothing either
    const incremental = await sync("next", "incremental");
    check("incremental: nothing written", incremental.added === 0 && incremental.updated === 0 && incremental.hidden === 0);

    // 5. a hidden property that reappears is published again with the same slug
    const base2 = await sync("base");
    const backRows = await snapshot();
    check("reappearing property is published again, same slug", backRows.get("1002")?.status === "published" && backRows.get("1002")?.slug === baseRows.get("1002")?.slug && base2.added === 0);
    await sync("next");

    // 6. properties_source = admin: the sync writes nothing
    await setSource("admin");
    const before = await snapshot();
    const settingsBefore = JSON.stringify(must(await admin.from("settings").select("last_sync_at, sync_cursor").single(), "settings"));
    process.env.PLEKTAN_FIXTURE_SET = "base";
    const skipped = await runSync({ mode: "full", log: () => undefined });
    const after = await snapshot();
    const settingsAfter = JSON.stringify(must(await admin.from("settings").select("last_sync_at, sync_cursor").single(), "settings"));
    check("admin source: sync is skipped", skipped.status === "skipped");
    check("admin source: nothing written", JSON.stringify([...before]) === JSON.stringify([...after]) && settingsBefore === settingsAfter);

    // 7. the anon key can't read raw / house
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const rawRead = await anon.from("properties").select("raw").limit(1);
    const houseRead = await anon.from("properties").select("house").limit(1);
    const okRead = await anon.from("properties").select("id, title").limit(1);
    const photosRead = await anon.from("property_photos").select("id").limit(1);
    check("anon cannot read raw", rawRead.error !== null);
    check("anon cannot read house", houseRead.error !== null);
    check("anon reads id, title", okRead.error === null && (okRead.data?.length ?? 0) > 0);
    check("anon still reads photos (RLS policy)", photosRead.error === null);
  } finally {
    await setSource(original);
    await rm(path.join(process.cwd(), "public", "r2-local"), { recursive: true, force: true });
    // Leave the local DB as seeded: no fixture rows behind.
    await admin.from("properties").delete().eq("source", "plektan").in("external_id", fixtureAdids);
    await admin.from("agents").delete().eq("source", "plektan").in("external_id", FIXTURE_USERS.map((user) => user.user_id));
    if (seedPublished.length > 0) {
      await admin.from("properties").update({ status: "published" }).in("id", seedPublished.map((row) => row.id));
    }
  }
};

main().then(
  () => {
    console.log(failures === 0 ? "\nsync:check OK" : `\nsync:check FAILED (${failures})`);
    process.exit(failures === 0 ? 0 : 1);
  },
  (error: unknown) => {
    console.error(`sync:check crashed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exit(1);
  },
);

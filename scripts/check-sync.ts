/**
 * Repeatable acceptance check for the Plektan sync, against LOCAL Supabase and Plektan fixtures only.
 * `pnpm sync:check` (needs `supabase start`). Exits non-zero on the first failed assertion.
 */
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
      .in("external_id", fixtureAdids),
    "snapshot",
  );
  return new Map(rows.map((row) => [row.external_id ?? "", row]));
};

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

    // 1. base
    const first = await sync("base");
    const baseRows = await snapshot();
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

    // 2. next: 1002 gone, 1001 price changed, 1013 new
    const second = await sync("next");
    const nextRows = await snapshot();
    check("next: removed property becomes hidden", nextRows.get("1002")?.status === "hidden");
    check("next: changed price is updated", nextRows.get("1001")?.price_amount !== baseRows.get("1001")?.price_amount && nextRows.get("1001")?.price_amount != null);
    check("next: slug of the changed one is stable", nextRows.get("1001")?.slug === baseRows.get("1001")?.slug);
    check("next: new property is published", nextRows.get("1013")?.status === "published");
    check("next: summary is 1 added / 1 updated / 1 hidden", second.added === 1 && second.updated === 1 && second.hidden === 1, `${second.added}/${second.updated}/${second.hidden}`);

    // 3. same again: nothing is written
    const agentsBefore = await agentsStamp();
    const third = await sync("next");
    const thirdRows = await snapshot();
    const sameStamps = [...nextRows].every(([id, row]) => thirdRows.get(id)?.updated_at === row.updated_at) && thirdRows.size === nextRows.size;
    check("rerun: all unchanged", third.added === 0 && third.updated === 0 && third.hidden === 0 && third.unchanged > 0, `unchanged ${third.unchanged}`);
    check("rerun: no updated_at changed", sameStamps);
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

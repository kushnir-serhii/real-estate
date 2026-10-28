import { runSync } from "@/lib/sync/run-sync";

const args = new Set(process.argv.slice(2));
const known = new Set(["--full", "--no-revalidate", "--force-hide"]);
const unknown = [...args].filter((arg) => !known.has(arg));
if (unknown.length > 0) {
  console.error(`Unknown flag(s): ${unknown.join(" ")} (expected --full, --no-revalidate, --force-hide)`);
  process.exit(2);
}

const revalidate = async (tags: string[]): Promise<boolean> => {
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret === "") {
    console.error("revalidate: CRON_SECRET is empty, cannot call the site");
    return false;
  }
  try {
    const response = await fetch(`${base}/api/cron/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error(`revalidate: the site answered ${response.status}`);
      return false;
    }
    console.log(`revalidate: ${tags.length} tag(s) sent`);
    return true;
  } catch (error) {
    console.error(`revalidate: request failed (${error instanceof Error ? error.name : "unknown"})`);
    return false;
  }
};

const main = async (): Promise<number> => {
  const result = await runSync({ mode: args.has("--full") ? "full" : "incremental", forceHide: args.has("--force-hide") });
  if (result.status === "skipped") return 0;

  const { summary, tags } = result;
  console.log(`sync summary: ${JSON.stringify(summary)}`);
  let code = summary.hideBlocked || summary.failed > 0 ? 1 : 0;

  if (tags.length > 0 && !args.has("--no-revalidate")) {
    // The data is already saved; a failed purge only delays the site until the cache expires.
    if (!(await revalidate(tags))) code = 1;
  }
  return code;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exit(1);
  },
);

export type SyncGuardInput = {
  demo: boolean;
  apiKey: string | undefined;
  fixtures: boolean;
};

export type SyncGuardDecision =
  | { action: "demo" }
  | { action: "run" }
  | { action: "stop"; code: 1 | 2; message: string };

/** Decides whether `pnpm sync` may call runSync, so fixtures never land in a real database by accident. */
export const decideSync = ({ demo, apiKey, fixtures }: SyncGuardInput): SyncGuardDecision => {
  if (demo) return { action: "demo" };
  const hasKey = (apiKey ?? "").trim() !== "";
  if (hasKey && fixtures) {
    return {
      action: "stop",
      code: 2,
      message:
        "--fixtures is not allowed when PLEKTAN_API_KEY is set: the sync would be real. Remove the flag, or empty the key to sync fixtures into a local Supabase.",
    };
  }
  if (!hasKey && !fixtures) {
    return {
      action: "stop",
      code: 1,
      message:
        "PLEKTAN_API_KEY is empty, so the sync would write fixture listings into the database. Nothing was written. Set the key, or pass --fixtures on purpose (pnpm sync --fixtures) when the database is a local Supabase.",
    };
  }
  return { action: "run" };
};

import { NextResponse } from "next/server";

import { retryLeads } from "@/features/leads/retry-leads";
import { isCronAuthorized } from "@/lib/cron/check-cron-secret";

/** Called by the scheduled workflow: retries lead deliveries that are due and alerts on exhausted ones. */
export const POST = async (request: Request) => {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await retryLeads());
  } catch {
    console.error("[leads-retry] run failed");
    return NextResponse.json({ error: "retry failed" }, { status: 500 });
  }
};

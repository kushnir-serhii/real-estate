import { NextResponse } from "next/server";

import { cleanupAssistant } from "@/features/assistant/cleanup-assistant";
import { isCronAuthorized } from "@/lib/cron/check-cron-secret";

/** Called by the scheduled workflow: deletes assistant transcripts older than 30 days (leads stay). */
export const POST = async (request: Request) => {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await cleanupAssistant());
  } catch {
    console.error("[assistant-cleanup] run failed");
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
};

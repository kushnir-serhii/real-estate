import { NextResponse } from "next/server";

import { assistantRequestSchema, encodeAssistantEvent } from "@/features/assistant/assistant-events";
import { runAssistantTurn } from "@/features/assistant/run-assistant-turn";

export const dynamic = "force-dynamic";

/** One visitor message in, an NDJSON stream of assistant events out (spec 010). */
export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const turn = runAssistantTurn({
    conversationId: parsed.data.conversation_id,
    message: parsed.data.message,
    pageUrl: parsed.data.page_url,
    propertySlug: parsed.data.property_slug,
    signal: request.signal,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await turn.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(encodeAssistantEvent(next.value)));
      } catch {
        // The turn already reports failures as events; this only guards against a bug in the stream itself.
        controller.close();
      }
    },
    async cancel() {
      // The visitor left: lets the turn save what was said and stop calling the model.
      await turn.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
};

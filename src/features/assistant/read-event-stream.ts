import { parseAssistantEventLine } from "./assistant-events";
import type { AssistantEvent } from "./assistant-events";

/** Complete lines of an NDJSON buffer plus the unfinished tail to keep for the next chunk. */
export const splitLines = (buffer: string): { lines: string[]; rest: string } => {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  return { lines, rest };
};

/**
 * Events of a `POST /api/assistant` response body, in order. Unknown or malformed lines are skipped.
 * Stopping the loop early (break / abort) cancels the body.
 */
export async function* readEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AssistantEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      const { lines, rest } = splitLines(buffer + decoder.decode(value, { stream: true }));
      buffer = rest;
      for (const line of lines) {
        const event = parseAssistantEventLine(line);
        if (event) yield event;
      }
    }
    const last = parseAssistantEventLine(buffer + decoder.decode());
    if (last) yield last;
  } finally {
    if (!finished) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

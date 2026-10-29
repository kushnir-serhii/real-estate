import { describe, expect, it } from "vitest";

import type { AssistantEvent } from "./assistant-events";
import { readEventStream, splitLines } from "./read-event-stream";

const CONVERSATION = "7d6a1f0e-3c1b-4a53-9d2f-0a1b2c3d4e5f";

const streamOf = (chunks: (string | Uint8Array)[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      controller.close();
    },
  });
};

const collect = async (stream: ReadableStream<Uint8Array>) => {
  const events: AssistantEvent[] = [];
  for await (const event of readEventStream(stream)) events.push(event);
  return events;
};

describe("splitLines", () => {
  it("keeps the unfinished tail", () => {
    expect(splitLines('{"a":1}\n{"b"')).toEqual({ lines: ['{"a":1}'], rest: '{"b"' });
    expect(splitLines("x\n")).toEqual({ lines: ["x"], rest: "" });
    expect(splitLines("")).toEqual({ lines: [], rest: "" });
  });
});

describe("readEventStream", () => {
  it("reads events split across chunks in any place", async () => {
    const events = await collect(
      streamOf([
        `{"type":"conversation","id":"${CONVERSATION}"}\n{"type":"te`,
        'xt","delta":"Прив',
        'іт"}\n{"type":"done"}\n',
      ]),
    );
    expect(events).toEqual([
      { type: "conversation", id: CONVERSATION },
      { type: "text", delta: "Привіт" },
      { type: "done" },
    ]);
  });

  it("decodes a multibyte letter split between chunks", async () => {
    const bytes = new TextEncoder().encode('{"type":"text","delta":"ї"}\n');
    // «ї» is two bytes in UTF-8: cut between them.
    const cut = bytes.indexOf(0xd1) + 1;
    const events = await collect(streamOf([bytes.slice(0, cut), bytes.slice(cut)]));
    expect(events).toEqual([{ type: "text", delta: "ї" }]);
  });

  it("skips malformed and unknown lines and reads a last line without a newline", async () => {
    const events = await collect(streamOf(['not json\n{"type":"unknown"}\r\n\n{"type":"done"}']));
    expect(events).toEqual([{ type: "done" }]);
  });

  it("cancels the body when the reader stops early", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode('{"type":"text","delta":"a"}\n'));
      },
      cancel() {
        cancelled = true;
      },
    });
    for await (const event of readEventStream(stream)) {
      expect(event.type).toBe("text");
      break;
    }
    expect(cancelled).toBe(true);
  });
});

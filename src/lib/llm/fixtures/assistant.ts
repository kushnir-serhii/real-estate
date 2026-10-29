import type { Llm, LlmEvent, LlmRequest } from "../types";
import { planFixtureReply } from "./script";

export const FIXTURE_MODEL = "fixture";
const CHUNK_SIZE = 6;
const DEFAULT_DELAY_MS = 25;

export type FixtureLlmOptions = {
  /** Pause between text chunks so the reply visibly streams. Tests pass 0. */
  delayMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const chunksOf = (text: string): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
  return chunks;
};

async function* run(request: LlmRequest, delayMs: number): AsyncGenerator<LlmEvent> {
  const step = planFixtureReply(request.messages);
  switch (step.kind) {
    case "text":
      for (const delta of chunksOf(step.text)) {
        if (request.signal?.aborted) return;
        if (delayMs > 0) await sleep(delayMs);
        yield { type: "text", delta };
      }
      yield { type: "finish", reason: "stop" };
      yield { type: "usage", usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    default: {
      const unreachable: never = step.kind;
      return unreachable;
    }
  }
}

/** Scripted assistant with the same interface as the OpenAI client. Costs nothing. */
export const createFixtureLlm = (options: FixtureLlmOptions = {}): Llm => ({
  model: FIXTURE_MODEL,
  stream: (request) => run(request, options.delayMs ?? DEFAULT_DELAY_MS),
});

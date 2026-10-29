import type { LlmUsage } from "./types";

/** USD per 1M tokens. Update when the provider's prices change; unknown models cost the most expensive known price. */
export const MODEL_PRICES_USD_PER_1M = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
} as const satisfies Record<string, { input: number; output: number }>;

type PriceEntry = { input: number; output: number };

const priceOf = (model: string): PriceEntry => {
  const known: Record<string, PriceEntry> = MODEL_PRICES_USD_PER_1M;
  const exact = known[model];
  if (exact) return exact;
  // Conservative for unknown models, so the spend cap errs on the safe side.
  return Object.values(known).reduce((max, p) => ({
    input: Math.max(max.input, p.input),
    output: Math.max(max.output, p.output),
  }));
};

/** Cost of one request in USD. Fixture usage is 0 tokens, so it costs 0. */
export const costUsd = (model: string, usage: LlmUsage): number => {
  const price = priceOf(model);
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
};

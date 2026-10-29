import { z } from "zod";

/** "41,5", " 41.5 " -> 41.5; anything else (empty, "abc", "1e3", "4 1", negative) -> NaN. */
export const parseRateInput = (value: unknown): number => {
  if (typeof value !== "string") return Number.NaN;
  const text = value.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
};

const rate = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label}: введіть число, наприклад 41,5` })
    .min(min, { error: `${label}: не менше ${min}` })
    .max(max, { error: `${label}: не більше ${max}` });

export const ratesFormSchema = z.object({
  UAH: rate("Гривень за 1 USD", 1, 1000),
  EUR: rate("Євро за 1 USD", 0.1, 10),
});

import { z } from "zod";

import { CURRENCIES } from "@/lib/db/property-values";

/**
 * The structured wishes an AI lead keeps in `leads.payload`, read leniently (field by field: one
 * malformed key drops only that wish). Pure and client-safe; shared by the delivery texts and the admin.
 */

export const AI_PAYMENTS = ["cash", "mortgage", "unknown"] as const;
export type AiPayment = (typeof AI_PAYMENTS)[number];

export const PAYMENT_LABELS: Record<Exclude<AiPayment, "unknown">, string> = {
  cash: "Готівка",
  mortgage: "Іпотека",
};

const TEXT_MAX = 500;
const text = z.string().trim().min(1).max(TEXT_MAX);

const budgetSchema = z
  .object({
    from: z.number().finite().nonnegative().optional().catch(undefined),
    to: z.number().finite().nonnegative().optional().catch(undefined),
    currency: z.enum(CURRENCIES).catch("USD"),
  })
  .refine((b) => b.from !== undefined || b.to !== undefined);

export const aiWishesSchema = z.object({
  districts: z.array(text).max(10).optional().catch(undefined),
  rooms: z.array(text).max(10).optional().catch(undefined),
  budget: budgetSchema.optional().catch(undefined),
  payment: z.enum(["cash", "mortgage"]).optional().catch(undefined),
  timing: text.optional().catch(undefined),
  summary: text.optional().catch(undefined),
});

export type AiWishes = z.infer<typeof aiWishesSchema>;

const CURRENCY_SIGNS = { UAH: "грн", USD: "$", EUR: "€" } as const;

const amount = (value: number): string => new Intl.NumberFormat("uk-UA").format(value).replace(/ | /g, " ");

/** «від 50 000 до 80 000 $», «до 3 000 000 грн». */
export const formatBudget = (budget: NonNullable<AiWishes["budget"]>): string => {
  const sign = CURRENCY_SIGNS[budget.currency];
  const parts: string[] = [];
  if (budget.from !== undefined) parts.push(`від ${amount(budget.from)}`);
  if (budget.to !== undefined) parts.push(`до ${amount(budget.to)}`);
  return `${parts.join(" ")} ${sign}`;
};

/** Labelled readable lines («Райони: …»), only for what is present. */
export const aiWishLines = (wishes: AiWishes): string[] => {
  const lines: string[] = [];
  if (wishes.districts?.length) lines.push(`Райони: ${wishes.districts.join(", ")}`);
  if (wishes.rooms?.length) lines.push(`Кімнат: ${wishes.rooms.join(", ")}`);
  if (wishes.budget) lines.push(`Бюджет: ${formatBudget(wishes.budget)}`);
  if (wishes.payment) lines.push(`Оплата: ${PAYMENT_LABELS[wishes.payment]}`);
  if (wishes.timing) lines.push(`Терміни: ${wishes.timing}`);
  if (wishes.summary) lines.push(`Суть запиту: ${wishes.summary}`);
  return lines;
};

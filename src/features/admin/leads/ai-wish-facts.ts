import { formatBudget, PAYMENT_LABELS } from "@/features/leads/ai-wishes";
import type { LeadWishes } from "./read-lead-wishes";

/** One labelled AI wish for the lead page; `numeric` values get `tabular-nums`. */
export type AiWishFact = { label: string; text: string; numeric?: boolean };

/** The assistant's structured wishes as label/value pairs, only what is present, in the order a manager reads them. */
export const aiWishFacts = (wishes: LeadWishes): AiWishFact[] => {
  const facts: AiWishFact[] = [];
  if (wishes.summary) facts.push({ label: "Суть запиту", text: wishes.summary });
  if (wishes.districts?.length) facts.push({ label: "Райони", text: wishes.districts.join(", ") });
  if (wishes.rooms?.length) facts.push({ label: "Кімнат", text: wishes.rooms.join(", "), numeric: true });
  if (wishes.budget) facts.push({ label: "Бюджет", text: formatBudget(wishes.budget), numeric: true });
  if (wishes.payment) facts.push({ label: "Оплата", text: PAYMENT_LABELS[wishes.payment] });
  if (wishes.timing) facts.push({ label: "Терміни", text: wishes.timing });
  return facts;
};

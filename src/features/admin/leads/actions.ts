"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminLead } from "@/lib/db/admin-leads";
import { requireAdmin } from "@/lib/auth/admin-session";
import { retryLeadChannel } from "@/features/leads/deliver-lead";
import { describeDeliveryError } from "./describe-delivery-error";
import type { RetryLeadState } from "./retry-state";

const retrySchema = z.object({ id: z.uuid(), channel: z.enum(["plektan", "telegram"]) });

const GENERIC_ERROR = "Не вдалося повторити. Спробуйте ще раз.";

/** Manual retry of one failed delivery channel. Admin only; the id is checked before anything runs. */
export const retryLeadDelivery = async (_prev: RetryLeadState, formData: FormData): Promise<RetryLeadState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: "Немає доступу" };

    const parsed = retrySchema.safeParse({ id: formData.get("id"), channel: formData.get("channel") });
    if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
    const { id, channel } = parsed.data;

    const result = await retryLeadChannel(id, channel);
    if (!result.found) return { status: "error", message: "Заявку не знайдено" };

    revalidatePath(`/admin/leads/${id}`);
    revalidatePath("/admin/leads");

    switch (result.outcome) {
      case "sent":
        return { status: "sent", channel };
      case "skipped":
        return { status: "skipped", channel };
      case "not_due":
        return { status: "not_due", channel };
      case "failed": {
        // The service role wrote the error; read it back through the user session (RLS) for the text.
        const lead = await getAdminLead(id);
        const stored = channel === "plektan" ? lead?.plektan_error : lead?.telegram_error;
        return { status: "failed", channel, error: describeDeliveryError(channel, stored ?? null) };
      }
    }
  } catch {
    return { status: "error", message: GENERIC_ERROR };
  }
};

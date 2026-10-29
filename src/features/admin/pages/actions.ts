"use server";

import { DEFAULT_PAGES } from "@/constants/pages";
import type { PageSlug } from "@/constants/pages";
import { requireAdmin } from "@/lib/auth/admin-session";
import { resetAdminPage, saveAdminPage } from "@/lib/db/admin-pages";
import { revalidatePage } from "@/lib/db/revalidate-page";
import { pageSlugSchema, pageToFormRaw, parsePageForm, readPageFormRaw } from "./page-form-schema";
import type { PageFormState, PageResetState } from "./page-form-state";

const GENERIC_ERROR = "Не вдалося зберегти. Спробуйте ще раз.";
const RESET_ERROR = "Не вдалося скинути. Спробуйте ще раз.";
const NO_ACCESS = "Немає доступу";
const UNKNOWN_PAGE = "Такої сторінки немає. Оновіть сторінку й спробуйте ще раз.";

const readSlug = (formData: FormData): PageSlug | null => {
  const parsed = pageSlugSchema.safeParse(formData.get("slug"));
  return parsed.success ? parsed.data : null;
};

const logFailure = (action: string, error: unknown): void => {
  // The message only: no form values.
  console.error(`${action} failed: ${error instanceof Error ? error.message : "unknown error"}`);
};

/** Saves a static page (creates its row on the first save). Admin only. Fields: see `readPageFormRaw` + `slug`. */
export const savePage = async (_prev: PageFormState, formData: FormData): Promise<PageFormState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };
    const slug = readSlug(formData);
    if (slug === null) return { status: "error", message: UNKNOWN_PAGE };

    const parsed = parsePageForm(slug, readPageFormRaw(formData));
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

    await saveAdminPage(slug, parsed.values);
    revalidatePage(slug);
    return { status: "saved" };
  } catch (error) {
    logFailure("savePage", error);
    return { status: "error", message: GENERIC_ERROR };
  }
};

/** Deletes the page's row: the site shows the built-in text again. Admin only. Field: `slug`. */
export const resetPage = async (_prev: PageResetState, formData: FormData): Promise<PageResetState> => {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { status: "error", message: NO_ACCESS };
    const slug = readSlug(formData);
    if (slug === null) return { status: "error", message: UNKNOWN_PAGE };

    await resetAdminPage(slug);
    revalidatePage(slug);
    return { status: "reset", values: pageToFormRaw(DEFAULT_PAGES[slug]) };
  } catch (error) {
    logFailure("resetPage", error);
    return { status: "error", message: RESET_ERROR };
  }
};

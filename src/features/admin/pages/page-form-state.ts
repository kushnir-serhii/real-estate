import type { PageFormErrors, PageFormRaw } from "./page-form-schema";

/** Result of `savePage`. */
export type PageFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "invalid"; errors: PageFormErrors }
  | { status: "error"; message: string };

export const INITIAL_PAGE_FORM_STATE: PageFormState = { status: "idle" };

/** Result of `resetPage`: the built-in values go back into the form. */
export type PageResetState =
  | { status: "idle" }
  | { status: "reset"; values: PageFormRaw }
  | { status: "error"; message: string };

export const INITIAL_PAGE_RESET_STATE: PageResetState = { status: "idle" };

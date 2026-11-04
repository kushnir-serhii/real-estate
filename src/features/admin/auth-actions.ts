"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPublicData, isDemoMode } from "@/lib/data-driver";
import { DEMO_COOKIE_NAME, DEMO_SESSION_MAX_AGE_S, signDemoSession } from "@/lib/demo/session";
import { createClient } from "@/lib/supabase/server";
import type { SignInState } from "./sign-in-state";

const signInSchema = z.object({
  email: z.email("Вкажіть коректний email"),
  password: z.string().min(1, "Введіть пароль"),
});

const DEFAULT_NEXT = "/admin/leads";

/** Only same-origin `/admin` paths are accepted as a redirect target. */
const safeNext = (value: unknown): string => {
  if (typeof value !== "string") return DEFAULT_NEXT;
  if (!(value === "/admin" || value.startsWith("/admin/") || value.startsWith("/admin?"))) return DEFAULT_NEXT;
  if (value.includes("\\")) return DEFAULT_NEXT;
  return value;
};

export const signIn = async (_prev: SignInState, formData: FormData): Promise<SignInState> => {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().slice(0, 320) : "";

  if (isDemoMode()) {
    return { status: "error", email, message: "У демо-режимі пароль не потрібен: натисніть «Увійти як демо-адміністратор»." };
  }
  if (!hasPublicData()) {
    return { status: "error", email, message: "Вхід зараз недоступний: адмінку ще не підключено до бази даних." };
  }

  const parsed = signInSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    return {
      status: "invalid",
      email,
      fieldErrors: { email: flat.email?.[0], password: flat.password?.[0] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", email, message: "Невірний email або пароль. Перевірте їх і спробуйте ще раз." };

  // The role is checked by the admin layout: a non-admin sees «Немає доступу» there.
  redirect(safeNext(formData.get("next")));
};

/** One click, no password: sets the signed demo cookie. Only on the demo driver; elsewhere it goes back to sign-in. */
export const signInDemo = async (formData: FormData): Promise<void> => {
  if (!isDemoMode()) redirect("/admin/sign-in");
  (await cookies()).set(DEMO_COOKIE_NAME, await signDemoSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE_S,
  });
  redirect(safeNext(formData.get("next")));
};

export const signOut = async (): Promise<void> => {
  if (isDemoMode()) {
    (await cookies()).delete(DEMO_COOKIE_NAME);
  } else if (hasPublicData()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/sign-in");
};

"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/leads/field-error";
import { signIn } from "./auth-actions";
import { INITIAL_SIGN_IN_STATE } from "./sign-in-state";

type SignInFormProps = { next: string };

export const SignInForm = ({ next }: SignInFormProps) => {
  const [state, action, pending] = useActionState(signIn, INITIAL_SIGN_IN_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const ids = { email: `${id}-email`, password: `${id}-password`, message: `${id}-message` };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  // React resets the form after the action; the email comes back as the new default value.
  const email = state.status === "idle" ? "" : state.email;
  const message = state.status === "error" ? state.message : null;

  // Take the user to the first field to fix; after wrong credentials, to the password.
  useEffect(() => {
    if (state.status === "idle") return;
    const target =
      state.status === "invalid"
        ? formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        : formRef.current?.querySelector<HTMLElement>('input[name="password"]');
    target?.focus();
  }, [state]);

  const errorProps = (field: "email" | "password") =>
    fieldErrors[field]
      ? { "aria-invalid": true, "aria-describedby": `${ids[field]}-error` }
      : { "aria-invalid": undefined, "aria-describedby": undefined };

  return (
    <form ref={formRef} action={action} noValidate aria-busy={pending} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={ids.email}>Email</Label>
        <Input
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={email}
          {...errorProps("email")}
        />
        <FieldError id={`${ids.email}-error`} message={fieldErrors.email} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={ids.password}>Пароль</Label>
        <Input
          id={ids.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...errorProps("password")}
        />
        <FieldError id={`${ids.password}-error`} message={fieldErrors.password} />
      </div>

      {/* Unmounted while pending, so the same message is announced again after a repeat attempt. */}
      {message && !pending ? (
        <p
          id={ids.message}
          role="alert"
          className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium break-words text-destructive"
        >
          {message}
        </p>
      ) : null}

      <p role="status" className="sr-only">
        {pending ? "Входимо…" : ""}
      </p>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Входимо…
          </>
        ) : (
          "Увійти"
        )}
      </Button>
    </form>
  );
};

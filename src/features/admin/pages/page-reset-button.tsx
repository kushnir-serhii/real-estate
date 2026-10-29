"use client";

import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { PageSlug } from "@/constants/pages";
import { resetPage } from "./actions";
import type { PageFormRaw } from "./page-form-schema";
import { INITIAL_PAGE_RESET_STATE } from "./page-form-state";
import type { PageResetState } from "./page-form-state";

type PageResetButtonProps = {
  slug: PageSlug;
  /** The page already shows the built-in text: nothing to reset. */
  disabled: boolean;
  /** Called with the built-in values after a successful reset. */
  onReset: (values: PageFormRaw) => void;
};

/** «Скинути до стандартного» with a confirm dialog. Errors stay in the dialog; success closes it. */
export const PageResetButton = ({ slug, disabled, onReset }: PageResetButtonProps) => {
  const [open, setOpen] = useState(false);
  const [dismissedError, setDismissedError] = useState<PageResetState | null>(null);

  const [state, formAction, pending] = useActionState(async (prev: PageResetState, formData: FormData) => {
    const next = await resetPage(prev, formData);
    if (next.status === "reset") {
      onReset(next.values);
      setOpen(false);
    }
    return next;
  }, INITIAL_PAGE_RESET_STATE);

  const error = state.status === "error" && state !== dismissedError ? state.message : null;

  const onOpenChange = (next: boolean) => {
    if (pending) return;
    if (!next) setDismissedError(state);
    setOpen(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="w-full sm:w-auto">
          <RotateCcw aria-hidden="true" />
          Скинути до стандартного
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-lg font-bold">Скинути до стандартного?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Заголовок, текст, SEO-поля й налаштування індексації повернуться до вбудованих. Ваші зміни зникнуть,
              відновити їх не вийде.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="h-auto min-h-11 py-2 whitespace-normal"
            >
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              {pending ? "Скидаємо…" : "Так, скинути"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
